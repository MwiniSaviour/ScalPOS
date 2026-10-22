package gg.novapos.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the window decor (the areas behind the status and navigation bars)
 * from the web layer so system chrome follows the in-app theme instead of the
 * device night mode.
 */
@CapacitorPlugin(name = "AppChrome")
public class AppChromePlugin extends Plugin {

    @PluginMethod
    public void setBarBackgroundColor(PluginCall call) {
        final String color = call.getString("color", "#ffffff");
        final Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                Window window = activity.getWindow();
                window.getDecorView().setBackgroundColor(Color.parseColor(color));
                // no white contrast scrim over a themed 3-button nav bar
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.setNavigationBarContrastEnforced(false);
                }
            } catch (RuntimeException ignored) {
                // unparsable color or missing window — leave chrome as is
            }
            call.resolve();
        });
    }
}
