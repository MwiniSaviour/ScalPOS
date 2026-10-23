package gg.novapos.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrint",
    permissions = {
        @Permission(
            strings = { Manifest.permission.BLUETOOTH_CONNECT },
            alias = BluetoothPrintPlugin.ALIAS
        )
    }
)
public class BluetoothPrintPlugin extends Plugin {

    static final String ALIAS = "bluetoothPrint";

    private static final String PENDING_LIST = "list";
    private static final String PENDING_PRINT = "print";
    private static final String CALLBACK_NAME = "bluetoothPrintCallback";

    private static final UUID SPP_UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private String pendingAction = null;
    private String pendingAddress = null;
    private String pendingData = null;

    @PluginMethod
    public void listPaired(PluginCall call) {
        if (connectActivityPermitted()) {
            doListPaired(call);
            return;
        }
        pendingAction = PENDING_LIST;
        pendingAddress = null;
        pendingData = null;
        requestAllPermissions(call, CALLBACK_NAME);
    }

    @PluginMethod
    public void print(PluginCall call) {
        final String address = call.getString("address");
        final String data = call.getString("data");
        if (address == null || data == null) {
            call.reject("address and data are required");
            return;
        }
        if (connectActivityPermitted()) {
            doPrint(address, data, call);
            return;
        }
        pendingAction = PENDING_PRINT;
        pendingAddress = address;
        pendingData = data;
        requestAllPermissions(call, CALLBACK_NAME);
    }

    @PermissionCallback
    public void bluetoothPrintCallback(PluginCall call) {
        if (!connectActivityPermitted()) {
            call.reject("permission", "Bluetooth permission denied");
            pendingAction = null;
            pendingAddress = null;
            pendingData = null;
            return;
        }

        final String action = pendingAction;
        final String address = pendingAddress;
        final String data = pendingData;
        pendingAction = null;
        pendingAddress = null;
        pendingData = null;

        if (PENDING_PRINT.equals(action)) {
            doPrint(address, data, call);
        } else if (PENDING_LIST.equals(action)) {
            doListPaired(call);
        } else {
            call.resolve();
        }
    }

    private boolean connectActivityPermitted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        return getActivity().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)
            == PackageManager.PERMISSION_GRANTED;
    }

    private BluetoothAdapter adapter() {
        BluetoothManager manager = (BluetoothManager) bridge.getContext()
            .getSystemService(android.content.Context.BLUETOOTH_SERVICE);
        return manager == null ? null : manager.getAdapter();
    }

    private void doListPaired(PluginCall call) {
        try {
            BluetoothAdapter adapter = adapter();
            if (adapter == null) {
                call.reject("no adapter", "This device has no Bluetooth adapter");
                return;
            }
            if (!adapter.isEnabled()) {
                call.resolve(newBluetoothState(false, new JSArray()));
                return;
            }
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            JSArray devices = new JSArray();
            if (bonded != null) {
                for (BluetoothDevice device : bonded) {
                    JSObject item = new JSObject();
                    Boolean thermal = device.getBluetoothClass() != null
                        && device.getBluetoothClass().getMajorDeviceClass()
                            == android.bluetooth.BluetoothClass.Device.Major.IMAGING;
                    item.put("name", device.getName() == null ? device.getAddress() : device.getName());
                    item.put("address", device.getAddress());
                    item.put("isThermal", thermal);
                    devices.put(item);
                }
            }
            call.resolve(newBluetoothState(true, devices));
        } catch (SecurityException e) {
            call.reject("permission", e.getMessage());
        } catch (RuntimeException e) {
            call.reject("error", e.getMessage());
        }
    }

    private JSObject newBluetoothState(boolean enabled, JSArray devices) {
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        result.put("devices", devices);
        return result;
    }

    private void doPrint(final String address, final String data, final PluginCall call) {
        new Thread(() -> {
            try {
                BluetoothAdapter adapter = adapter();
                if (adapter == null) {
                    call.reject("no adapter", "This device has no Bluetooth adapter");
                    return;
                }
                try {
                    adapter.cancelDiscovery();
                } catch (RuntimeException ignored) {
                }
                BluetoothDevice device = adapter.getRemoteDevice(address);
                final BluetoothSocket socket =
                    device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                try {
                    OutputStream out = socket.getOutputStream();
                    out.write(Base64.decode(data, Base64.DEFAULT));
                    out.flush();
                    Thread.sleep(150L);
                } finally {
                    try {
                        socket.close();
                    } catch (Exception ignored) {
                    }
                }
                call.resolve();
            } catch (Throwable throwable) {
                call.reject("error",
                    throwable.getMessage() == null ? throwable.toString() : throwable.getMessage());
            }
        }, "nova-bt-print").start();
    }

}
