import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { parseCsv, parseXlsx } from "../../apps/desktop/src/lib/import/parse.ts";
import { validateTable } from "../../apps/desktop/src/lib/import/validate.ts";
import { mapHeaders, normalizeHeader } from "../../apps/desktop/src/lib/import/columns.ts";

type ZipEntry = { name: string; data: Buffer; method: 0 | 8 };

function makeZip(entries: ZipEntry[]): ArrayBuffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const payload = entry.method === 8 ? deflateRawSync(entry.data) : entry.data;

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(entry.method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(entry.method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);

    locals.push(local, payload);
    centrals.push(central);
    offset += local.length + payload.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  const bytes = Buffer.concat([...locals, centralDirectory, end]);
  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  return out.buffer;
}

function makeXlsx(method: 0 | 8): ArrayBuffer {
  const xml = (value: string) => Buffer.from(value, "utf8");
  return makeZip([
    {
      name: "xl/workbook.xml",
      method,
      data: xml(
        '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Products" sheetId="1" r:id="rId1"/></sheets></workbook>',
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      method,
      data: xml(
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      ),
    },
    {
      name: "xl/sharedStrings.xml",
      method,
      data: xml('<?xml version="1.0"?><sst><si><t>Shared Rice</t></si></sst>'),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      method,
      data: xml(
        '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
          '<row r="1"><c r="A1" t="inlineStr"><is><t>name</t></is></c><c r="B1" t="inlineStr"><is><t>sku</t></is></c><c r="C1" t="inlineStr"><is><t>price</t></is></c><c r="D1" t="inlineStr"><is><t>stock</t></is></c><c r="E1" t="inlineStr"><is><t>category</t></is></c></row>' +
          '<row r="2"><c r="A2" t="s"><v>0</v></c><c r="B2" t="inlineStr"><is><t>SKU-X</t></is></c><c r="C2"><v>12.5</v></c><c r="D2"><v>3</v></c><c r="E2" t="inlineStr"><is><t>Rice</t></is></c></row>' +
          '<row r="4"><c r="A4" t="inlineStr"><is><t>Oil</t></is></c><c r="C4"><v>20</v></c></row>' +
          '</sheetData></worksheet>',
      ),
    },
  ]);
}

describe("CSV import", () => {
  test("parses BOM, quoted commas, escaped quotes and CRLF", () => {
    const table = parseCsv('\uFEFFname,sku,description\r\n"Rice, 5kg",SK1,"said ""5kg"""\r\n');
    assert.equal(table.headers[0], "name");
    assert.deepEqual(table.rows[0], ["Rice, 5kg", "SK1", 'said "5kg"']);
    assert.equal(table.rowNumbers[0], 2);
  });

  test("maps aliases and validates values", () => {
    const result = validateTable(
      parseCsv(
        "Product Name,Product Code,Bar Code,Selling Price,Cost,Qty,Category,UOM,Reorder Level,Notes,Active\n" +
          "Rice,SKU1,123456,GH₵25.00,₵15,2,Rice,pack,5,Good,yes",
      ),
    );
    assert.equal(result.issues.length, 0);
    assert.deepEqual(result.rows[0], {
      name: "Rice",
      sku: "SKU1",
      barcode: "123456",
      price: 25,
      cost_price: 15,
      stock: 2,
      low_stock_at: 5,
      unit: "pack",
      description: "Good",
      category: "Rice",
      active: true,
    });
  });

  test("reports row numbers and excludes invalid rows", () => {
    const result = validateTable(
      parseCsv("name,sku,barcode\nAlpha,S1,111\nBeta,S1,222\nGamma,S2,111"),
    );
    assert.equal(result.rows.length, 1);
    assert.equal(result.issues.length, 2);
    assert.deepEqual(
      result.issues.map((issue) => issue.row),
      [3, 4],
    );
  });

  test("rejects duplicate and ambiguous header mappings", () => {
    assert.equal(normalizeHeader(" Product Name* "), "product name");
    const mapped = mapHeaders(["name", "Name", "mystery"]);
    assert.deepEqual(mapped.fields, ["name", null, null]);
    assert.deepEqual(mapped.unknown, ["name", "mystery"]);
    assert.deepEqual(mapped.missingRequired, []);
  });
});

describe("XLSX import", () => {
  for (const method of [0, 8] as const) {
    test(`reads shared strings, inline strings, numbers and row gaps (method ${method})`, async () => {
      const table = await parseXlsx(makeXlsx(method));
      assert.deepEqual(table.headers, ["name", "sku", "price", "stock", "category"]);
      assert.equal(table.rows.length, 2);
      assert.deepEqual(table.rows[0], ["Shared Rice", "SKU-X", "12.5", "3", "Rice"]);
      assert.equal(table.rowNumbers[0], 2);
      assert.deepEqual(table.rows[1], ["Oil", "", "20"]);
      assert.equal(table.rowNumbers[1], 4);
    });
  }
});
