package gg.novapos.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.Random;

@CapacitorPlugin(name = "NovaAlerts", permissions = {
    @Permission(alias = "postNotifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class NovaAlertsPlugin extends Plugin {

    private static final String CHANNEL_ID = "nova-pos-alerts";
    private final Random random = new Random();

    private boolean postsGranted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true;
        }
        return getActivity().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED;
    }

    private void ensureChannel() {
        NotificationManager nm = (NotificationManager) getActivity()
            .getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Nova POS alerts",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Sales and low stock alerts");
        nm.createNotificationChannel(channel);
    }

    @PluginMethod
    public void show(PluginCall call) {
        final String title = call.getString("title", "");
        final String body = call.getString("body", "");
        if (title.isEmpty()) {
            call.reject("title required");
            return;
        }
        if (!postsGranted()) {
            call.resolve(new JSObject().put("shown", false).put("granted", false));
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                ensureChannel();
                Context ctx = getActivity().getApplicationContext();
                int id = call.getInt("id", Math.abs(random.nextInt()));
                Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
                PendingIntent launch = open == null
                    ? null
                    : PendingIntent.getActivity(ctx, 0, open,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.stat_notify_chat)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT);
                if (launch != null) {
                    builder.setContentIntent(launch);
                }
                NotificationManager nm = (NotificationManager) ctx
                    .getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.notify(id, builder.build());
                }
                call.resolve(new JSObject().put("shown", true).put("granted", true));
            } catch (RuntimeException e) {
                call.reject(e.getMessage() == null ? "notification failed" : e.getMessage());
            }
        });
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }
        if (postsGranted()) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }
        requestPermissionForAlias("postNotifications", call, "handleNotifPermission");
    }

    @PermissionCallback
    @PluginMethod
    public void handleNotifPermission(PluginCall call) {
        call.resolve(new JSObject().put("granted", postsGranted()));
    }
}
