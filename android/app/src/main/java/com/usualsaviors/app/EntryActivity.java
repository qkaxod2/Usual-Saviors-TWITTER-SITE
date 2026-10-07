package com.usualsaviors.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class EntryActivity extends Activity {
 public static final String HOME="https://chronicle-atlas.qkaxdo2.chatgpt.site/";
 public static Uri safeUrl(Uri uri) {
  return uri!=null && "https".equals(uri.getScheme()) && "chronicle-atlas.qkaxdo2.chatgpt.site".equals(uri.getHost()) && uri.getUserInfo()==null && uri.getPort()==-1 ? uri : Uri.parse(HOME);
 }
 public static boolean hasChrome(Activity activity) {
  try { return activity.getPackageManager().getApplicationInfo("com.android.chrome",0).enabled; }
  catch(android.content.pm.PackageManager.NameNotFoundException e) { return false; }
 }
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  boolean ready=getSharedPreferences("notification-diagnostics",MODE_PRIVATE).getBoolean("seen-v3",false)&&hasChrome(this);
  Intent next=new Intent(this,ready?LauncherActivity.class:NotificationDiagnosticsActivity.class);
  next.setData(safeUrl(getIntent().getData()));
  startActivity(next);finish();
 }
}
