package gg.novapos.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(AppChromePlugin.class);
    registerPlugin(BluetoothPrintPlugin.class);
    registerPlugin(BluetoothHidPlugin.class);
    registerPlugin(NovaAlertsPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
