package com.usualsaviors.app;

import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.net.Uri;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk={28,33,35})
public class NotificationDiagnosticsTest {
 @Test public void channelStatesAreDistinct(){
  assertTrue(NotificationDiagnosticsActivity.channelStatus(0,false).contains("차단됨"));
  assertTrue(NotificationDiagnosticsActivity.channelStatus(4,true).contains("그룹 차단됨"));
  assertTrue(NotificationDiagnosticsActivity.channelStatus(2,false).contains("중요도가 낮습니다"));
  assertTrue(NotificationDiagnosticsActivity.channelStatus(4,false).contains("보장하지는 않습니다"));
 }
 @Test public void chromeIsExplicitAndLauncherPrivate() throws Exception {
  android.app.Application app=RuntimeEnvironment.getApplication();
  android.content.pm.ActivityInfo info=app.getPackageManager().getActivityInfo(new ComponentName(app,"com.google.androidbrowserhelper.trusted.LauncherActivity"),PackageManager.GET_META_DATA);
  assertEquals("com.android.chrome",info.metaData.getString("android.support.customtabs.trusted.LAUNCHING_BROWSER"));
  assertFalse(info.exported);
 }
 @Test public void foreignDeepLinksAreRejected(){
  assertEquals(EntryActivity.HOME,EntryActivity.safeUrl(Uri.parse("https://evil.example")).toString());
  String link=EntryActivity.HOME+"?notification=abc";
  assertEquals(link,EntryActivity.safeUrl(Uri.parse(link)).toString());
 }
 @Test public void diagnosticScreenOpensWithoutChrome(){
  try(org.robolectric.android.controller.ActivityController<NotificationDiagnosticsActivity> activity=Robolectric.buildActivity(NotificationDiagnosticsActivity.class).setup()){
   assertFalse(EntryActivity.hasChrome(activity.get()));
   assertNotNull(activity.get().findViewById(android.R.id.content));
  }
 }
}
