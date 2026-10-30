package com.ilo.klaody;

import android.os.Build;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(DownloadsPlugin.class);
    SplashScreen.installSplashScreen(this);
    // Required by Capacitor 8 (SystemBars insetsHandling != "disable"): draws the app behind
    // the status/navigation bars and makes them transparent instead of opaque white/black bands.
    EdgeToEdge.enable(this);
    super.onCreate(savedInstanceState);

    // 3-button navigation otherwise gets a translucent scrim that looks like a white band.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      getWindow().setNavigationBarContrastEnforced(false);
    }
  }
}
