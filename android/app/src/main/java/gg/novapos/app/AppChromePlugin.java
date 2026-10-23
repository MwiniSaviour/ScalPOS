package gg.novapos.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
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
            } catch (RuntimeException ignored) {
                // unparsable color or missing window — leave the decor as is
            }
            // status bar follows the web theme too (ignored on API 35+, fine)
            try {
                Window window = activity.getWindow();
                window.setStatusBarColor(Color.parseColor(color));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.setStatusBarContrastEnforced(false);
                }
            } catch (RuntimeException ignored) {
            }
            // no white contrast scrim over a themed 3-button nav bar
            try {
                Window window = activity.getWindow();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.setNavigationBarContrastEnforced(false);
                }
            } catch (RuntimeException ignored) {
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        final String url = call.getString("url", "");
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            call.reject("invalid url");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (RuntimeException e) {
            call.reject(e.getMessage() == null ? "no browser available" : e.getMessage());
        }
    }
}
