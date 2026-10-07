package com.usualsaviors.app;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import com.google.androidbrowserhelper.trusted.LauncherActivity;
import com.google.androidbrowserhelper.trusted.ManageDataLauncherActivity;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.android.controller.ActivityController;
import android.content.ComponentName;
import android.content.Intent;
import org.robolectric.shadows.ShadowAlertDialog;
import static org.junit.Assert.assertNotNull;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = {28, 33, 35})
public class LauncherTest {
 @Test public void coldStartWithoutBrowserShowsRecovery() {
  Intent intent = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  try (ActivityController<EntryActivity> controller = Robolectric.buildActivity(EntryActivity.class, intent)) {
   controller.create().start().resume();
   Intent next=org.robolectric.Shadows.shadowOf(controller.get()).getNextStartedActivity();
   org.junit.Assert.assertEquals(NotificationDiagnosticsActivity.class.getName(),next.getComponent().getClassName());
  }
 }
 @Test public void startupManagedComponentIsRegistered() throws Exception {
  android.app.Application app = RuntimeEnvironment.getApplication();
  app.getPackageManager().getActivityInfo(new ComponentName(app, ManageDataLauncherActivity.class), 0);
 }
}
