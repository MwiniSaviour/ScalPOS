import * as cloud from "./data-cloud"
import * as local from "./data-local"
const impl = process.env.NEXT_PUBLIC_OFFLINE_DESKTOP === "1" ? local : cloud

export const makeLocalId = impl.makeLocalId
export const mapCategory = cloud.mapCategory
export const mapCustomer = cloud.mapCustomer
export const mapSupplier = cloud.mapSupplier
export const mapPurchaseOrder = cloud.mapPurchaseOrder
export const mapStaff = cloud.mapStaff
export const mapAppointment = cloud.mapAppointment
export const mapPackage = cloud.mapPackage
export const mapSale = cloud.mapSale
export const fetchCategories = impl.fetchCategories
export const fetchProducts = impl.fetchProducts
export const fetchProduct = impl.fetchProduct
export const createProduct = impl.createProduct
export const updateProduct = impl.updateProduct
export const adjustStock = impl.adjustStock
export const fetchStockMoves = impl.fetchStockMoves
export const deleteProduct = impl.deleteProduct
export const createCategory = impl.createCategory
export const updateCategory = impl.updateCategory
export const deleteCategory = impl.deleteCategory
export const fetchCustomers = impl.fetchCustomers
export const fetchCustomer = impl.fetchCustomer
export const createCustomer = impl.createCustomer
export const updateCustomer = impl.updateCustomer
export const deleteCustomer = impl.deleteCustomer
export const fetchAppointments = impl.fetchAppointments
export const createAppointment = impl.createAppointment
export const updateAppointment = impl.updateAppointment
export const deleteAppointment = impl.deleteAppointment
export const fetchPackages = impl.fetchPackages
export const createPackage = impl.createPackage
export const updatePackage = impl.updatePackage
export const deletePackage = impl.deletePackage
export const withCommissions = impl.withCommissions
export const fetchRestaurantTables = impl.fetchRestaurantTables
export const createRestaurantTable = impl.createRestaurantTable
export const updateRestaurantTable = impl.updateRestaurantTable
export const deleteRestaurantTable = impl.deleteRestaurantTable
export const fetchRecipes = impl.fetchRecipes
export const upsertRecipe = impl.upsertRecipe
export const setTicketStatus = impl.setTicketStatus
export const placeSale = impl.placeSale
export const buildOrderLocalId = impl.buildOrderLocalId
export const fetchSales = impl.fetchSales
export const fetchSale = impl.fetchSale
export const fetchSaleByLocalId = impl.fetchSaleByLocalId
export const recordOrderPayment = impl.recordOrderPayment
export const fetchSettings = impl.fetchSettings
export const mapSettings = cloud.mapSettings
export const updateSettings = impl.updateSettings
export const fetchStaff = impl.fetchStaff
export const upsertStaff = impl.upsertStaff
export const deleteStaff = impl.deleteStaff
export const inviteEmployee = impl.inviteEmployee
export const fetchSuppliers = impl.fetchSuppliers
export const upsertSupplier = impl.upsertSupplier
export const deleteSupplier = impl.deleteSupplier
export const fetchPurchaseOrders = impl.fetchPurchaseOrders
export const fetchPurchaseOrder = impl.fetchPurchaseOrder
export const upsertPurchaseOrder = impl.upsertPurchaseOrder
export const deletePurchaseOrder = impl.deletePurchaseOrder
export const receivePurchaseOrder = impl.receivePurchaseOrder
export const fetchProductBatches = impl.fetchProductBatches
export const fetchProductBatchesForProducts = impl.fetchProductBatchesForProducts
export const createProductBatch = impl.createProductBatch
export const updateProductBatch = impl.updateProductBatch
export const deleteProductBatch = impl.deleteProductBatch
export const findProductByBarcode = impl.findProductByBarcode
export const importProducts = impl.importProducts

export const PRODUCT_SELECT = cloud.PRODUCT_SELECT

export type {
  CategoryInput,
  ProductInput,
  ProductBatchInput,
  CustomerInput,
  SupplierInput,
  PurchaseOrderInput,
  StaffInput,
  AppointmentInput,
  PackageInput,
  SaleInput,
} from "./data-cloud"

