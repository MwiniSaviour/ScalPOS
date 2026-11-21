package gg.novapos.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothHidDevice;
import android.bluetooth.BluetoothHidDeviceAppSdpSettings;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "BluetoothHid",
    permissions = {
        @Permission(
            strings = { Manifest.permission.BLUETOOTH_CONNECT },
            alias = BluetoothHidPlugin.ALIAS
        )
    }
)
public class BluetoothHidPlugin extends Plugin {

    static final String ALIAS = "bluetoothHid";

    private static final byte REPORT_ID = 0;

    private static final byte[] KEYBOARD_DESCRIPTOR = new byte[] {
        (byte) 0x05, (byte) 0x01, (byte) 0x09, (byte) 0x06, (byte) 0xA1, (byte) 0x01,
        (byte) 0x05, (byte) 0x07, (byte) 0x19, (byte) 0xE0, (byte) 0x29, (byte) 0xE7,
        (byte) 0x15, (byte) 0x00, (byte) 0x25, (byte) 0x07, (byte) 0x75, (byte) 0x01,
        (byte) 0x95, (byte) 0x08, (byte) 0x81, (byte) 0x02, (byte) 0x75, (byte) 0x08,
        (byte) 0x95, (byte) 0x01, (byte) 0x81, (byte) 0x01, (byte) 0x75, (byte) 0x01,
        (byte) 0x95, (byte) 0x05, (byte) 0x05, (byte) 0x08, (byte) 0x19, (byte) 0x01,
        (byte) 0x29, (byte) 0x05, (byte) 0x91, (byte) 0x02, (byte) 0x75, (byte) 0x03,
        (byte) 0x95, (byte) 0x01, (byte) 0x91, (byte) 0x01, (byte) 0x75, (byte) 0x08,
        (byte) 0x95, (byte) 0x06, (byte) 0x15, (byte) 0x00, (byte) 0x26, (byte) 0xFF,
        (byte) 0x00, (byte) 0x05, (byte) 0x07, (byte) 0x19, (byte) 0x00, (byte) 0x29,
        (byte) 0xFF, (byte) 0x81, (byte) 0x00, (byte) 0xC0
    };

    private BluetoothAdapter adapter;
    private BluetoothHidDevice hid;
    private boolean registered;
    private BluetoothDevice connected;

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P);
        call.resolve(result);
    }

    @PluginMethod
    public void register(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            call.reject("unsupported", "Bluetooth HID needs Android 9 or newer");
            return;
        }
        if (!permitted()) {
            call.save();
            requestAllPermissions(call, ALIAS + "Callback");
            return;
        }
        doRegister(call);
    }

    @PermissionCallback
    public void bluetoothHidCallback(PluginCall call) {
        if (!permitted()) {
            call.reject("permission", "Bluetooth permission denied");
            return;
        }
        if ("register".equals(call.getMethodName())) {
            doRegister(call);
        } else if ("connect".equals(call.getMethodName())) {
            doConnect(call);
        } else {
            call.resolve();
        }
    }

    private boolean permitted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return getActivity().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)
            == PackageManager.PERMISSION_GRANTED;
    }

    private BluetoothAdapter adapter() {
        if (adapter != null) return adapter;
        BluetoothManager manager = (BluetoothManager) bridge.getContext()
            .getSystemService(android.content.Context.BLUETOOTH_SERVICE);
        adapter = manager == null ? null : manager.getAdapter();
        return adapter;
    }

    private void doRegister(PluginCall call) {
        try {
            BluetoothAdapter a = adapter();
            if (a == null) {
                call.reject("no adapter", "This device has no Bluetooth adapter");
                return;
            }
            a.getProfileProxy(bridge.getContext(), new BluetoothProfile.ServiceListener() {
                @Override
                public void onServiceConnected(int profile, BluetoothProfile proxy) {
                    hid = (BluetoothHidDevice) proxy;
                    BluetoothHidDeviceAppSdpSettings sdp =
                        new BluetoothHidDeviceAppSdpSettings(
                            "Nova POS Scanner",
                            "Barcode keyboard for Nova POS",
                            "Nova POS",
                            (byte) 0x41,
                            KEYBOARD_DESCRIPTOR);
                    boolean ok = hid.registerApp(
                        sdp,
                        null,
                        null,
                        new java.util.concurrent.Executor() {
                            @Override
                            public void execute(Runnable command) {
                                command.run();
                            }
                        },
                        new BluetoothHidDevice.Callback() {
                            @Override
                            public void onAppStatusChanged(BluetoothDevice device, boolean isRegistered) {
                                registered = isRegistered;
                                notifyState();
                            }

                            @Override
                            public void onConnectionStateChanged(BluetoothDevice device, int state) {
                                if (state == BluetoothProfile.STATE_CONNECTED) {
                                    connected = device;
                                } else if (state == BluetoothProfile.STATE_DISCONNECTED) {
                                    connected = null;
                                }
                                notifyState();
                            }
                        }
                    );
                    if (!ok) {
                        call.reject("register failed", "Could not register the Bluetooth keyboard");
                        return;
                    }
                    JSObject result = new JSObject();
                    result.put("registered", true);
                    call.resolve(result);
                }

                @Override
                public void onServiceDisconnected(int profile) {
                    hid = null;
                    registered = false;
                    connected = null;
                    notifyState();
                }
            }, BluetoothProfile.HID_DEVICE);
        } catch (SecurityException e) {
            call.reject("permission", e.getMessage());
        } catch (Throwable t) {
            call.reject("error", t.getMessage() == null ? t.toString() : t.getMessage());
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("address required", "A device address is required");
            return;
        }
        if (!permitted()) {
            call.save();
            requestAllPermissions(call, ALIAS + "Callback");
            return;
        }
        doConnect(call);
    }

    private void doConnect(PluginCall call) {
        try {
            BluetoothAdapter a = adapter();
            if (a == null || hid == null || !registered) {
                call.reject("not registered", "Register the keyboard first");
                return;
            }
            BluetoothDevice device = a.getRemoteDevice(call.getString("address"));
            boolean ok = hid.connect(device);
            if (!ok) {
                call.reject("connect failed", "Pair the desktop with this phone first");
                return;
            }
            call.resolve();
        } catch (SecurityException e) {
            call.reject("permission", e.getMessage());
        } catch (Throwable t) {
            call.reject("error", t.getMessage() == null ? t.toString() : t.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            if (hid != null && connected != null) hid.disconnect(connected);
            connected = null;
            call.resolve();
        } catch (SecurityException e) {
            call.reject("permission", e.getMessage());
        }
    }

    @PluginMethod
    public void getState(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P);
            result.put("registered", registered);
            result.put("connected", connected != null);
            result.put("name", connected == null ? null : connected.getName());
            call.resolve(result);
        } catch (SecurityException e) {
            JSObject result = new JSObject();
            result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P);
            result.put("registered", false);
            result.put("connected", false);
            result.put("name", null);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void sendText(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("text required", "Nothing to send");
            return;
        }
        if (hid == null || connected == null) {
            call.reject("not connected", "Connect to a desktop first");
            return;
        }
        final String value = text;
        new Thread(() -> {
            try {
                for (int i = 0; i < value.length(); i++) {
                    typeChar(value.charAt(i));
                }
                typeChar('\n');
                JSObject result = new JSObject();
                result.put("sent", value.length() + 1);
                call.resolve(result);
            } catch (Throwable t) {
                call.reject("send failed", t.getMessage() == null ? t.toString() : t.getMessage());
            }
        }, "nova-bt-hid").start();
    }

    private void typeChar(char c) throws InterruptedException {
        byte modifier = 0;
        byte key = keyCode(c);
        if (key == 0) return;
        if (c >= 'A' && c <= 'Z') {
            modifier = 0x02;
            key = (byte) (0x04 + (c - 'A'));
        } else if ("!@#$%^&*()_+{}|:\"<>?~".indexOf(c) >= 0) {
            modifier = 0x02;
        }
        hid.sendReport(connected, REPORT_ID, report(modifier, key));
        Thread.sleep(12);
        hid.sendReport(connected, REPORT_ID, report((byte) 0, (byte) 0));
        Thread.sleep(12);
    }

    private static byte[] report(byte modifier, byte key) {
        return new byte[] { modifier, 0, key, 0, 0, 0, 0, 0 };
    }

    private static byte keyCode(char c) {
        if (c >= 'a' && c <= 'z') return (byte) (0x04 + (c - 'a'));
        if (c >= 'A' && c <= 'Z') return (byte) (0x04 + (c - 'A'));
        if (c >= '1' && c <= '9') return (byte) (0x1E + (c - '1'));
        if (c == '0') return 0x27;
        if (c == '\n' || c == '\r') return 0x28;
        if (c == ' ') return 0x2C;
        if (c == '-') return 0x2D;
        if (c == '=') return 0x2E;
        if (c == '[') return 0x2F;
        if (c == ']') return 0x30;
        if (c == '\\') return 0x31;
        if (c == ';') return 0x33;
        if (c == '\'') return 0x34;
        if (c == '`') return 0x35;
        if (c == ',') return 0x36;
        if (c == '.') return 0x37;
        if (c == '/') return 0x38;
        return 0;
    }

    private void notifyState() {
        JSObject result = new JSObject();
        result.put("registered", registered);
        result.put("connected", connected != null);
        try {
            result.put("name", connected == null ? null : connected.getName());
        } catch (SecurityException e) {
            result.put("name", null);
        }
        notifyListeners("stateChange", result);
    }
}
