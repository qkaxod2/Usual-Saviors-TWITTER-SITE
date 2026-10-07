package com.usualsaviors.app;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationChannelGroup;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.core.app.NotificationManagerCompat;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Reads only this APK's settings. Never represents browser settings as app settings. */
public class NotificationDiagnosticsActivity extends Activity {
 private LinearLayout content;
 private static final int TEXT=Color.rgb(235,239,245);
 public static String channelStatus(int importance,boolean groupBlocked) {
  if(groupBlocked)return "알림 그룹 차단됨";
  if(importance==NotificationManager.IMPORTANCE_NONE)return "알림 채널 차단됨";
  if(importance<NotificationManager.IMPORTANCE_HIGH)return "알림은 허용되어 있지만 팝업 표시 중요도가 낮습니다";
  return "팝업 표시 가능한 중요도입니다. 실제 표시 여부까지 보장하지는 않습니다";
 }
 @Override public void onCreate(Bundle state){super.onCreate(state);}
 @Override public void onResume(){super.onResume();render();}
 private void text(String value,int size){TextView v=new TextView(this);v.setText(value);v.setTextColor(TEXT);v.setTextSize(size);v.setPadding(0,12,0,12);content.addView(v);}
 private void button(String title,View.OnClickListener action){Button b=new Button(this);b.setText(title);b.setAllCaps(false);b.setOnClickListener(action);content.addView(b);}
 private void open(Intent intent){try{startActivity(intent);}catch(android.content.ActivityNotFoundException e){text("이 기기에서는 해당 설정 화면을 열 수 없습니다. 휴대폰 설정에서 앱 알림을 확인해 주세요.",16);}}
 private Intent appSettings(String pkg){
  if(Build.VERSION.SDK_INT>=26)return new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,pkg);
  return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+pkg));
 }
 private void render(){
  ScrollView scroll=new ScrollView(this);content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);
  int p=(int)(24*getResources().getDisplayMetrics().density);content.setPadding(p,p*2,p,p*2);content.setBackgroundColor(Color.rgb(16,18,30));
  scroll.addView(content);setContentView(scroll);
  content.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(p,p+insets.getSystemWindowInsetTop(),p,p+insets.getSystemWindowInsetBottom());return insets;});content.requestApplyInsets();
  text("알림 진단",26);text("Usual Saviors 1.0.2",16);
  text(EntryActivity.hasChrome(this)?"실행 브라우저는 Chrome으로 지정되어 있습니다.":"Chrome이 없거나 사용 중지되어 있습니다. Chrome을 설치하거나 사용 설정해야 앱을 실행할 수 있습니다.",17);
  button("Chrome 설치 또는 업데이트",v->open(new Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/apps/details?id=com.android.chrome"))));
  text(NotificationManagerCompat.from(this).areNotificationsEnabled()?"앱 전체 알림 허용됨":"앱 전체 알림 차단됨. 앱 알림 설정에서 허용해 주세요.",19);
  if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)
   button("앱 알림 권한 요청",v->requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},10));
  button("앱 알림 설정 열기",v->open(appSettings(getPackageName())));
  NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
  if(Build.VERSION.SDK_INT>=29 && manager.areNotificationsPaused())text("시스템이 이 앱의 알림을 일시 중지한 상태입니다.",17);
  if(Build.VERSION.SDK_INT>=26){
   java.util.List<NotificationChannel> channels=manager.getNotificationChannels();
   if(channels.isEmpty())text("앱 알림 채널이 아직 없습니다. 차단으로 판정하지 않습니다. 사이트에서 알림을 켜고 테스트한 뒤 다시 확인해 주세요.",17);
   for(NotificationChannel channel:channels){
    NotificationChannelGroup group=Build.VERSION.SDK_INT>=28&&channel.getGroup()!=null?manager.getNotificationChannelGroup(channel.getGroup()):null;
    text(channel.getName()+"\n"+channelStatus(channel.getImportance(),Build.VERSION.SDK_INT>=28&&group!=null&&group.isBlocked()),17);
    button(channel.getName()+" 설정 열기",v->open(new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()).putExtra(Settings.EXTRA_CHANNEL_ID,channel.getId())));
   }
  }else text("이 안드로이드 버전에서는 채널별 중요도를 조회할 수 없습니다.",16);
  int filter=manager.getCurrentInterruptionFilter();
  if(filter!=NotificationManager.INTERRUPTION_FILTER_ALL && filter!=NotificationManager.INTERRUPTION_FILTER_UNKNOWN)text("방해 금지 필터가 켜져 있습니다. 이 알림에 적용되는지는 예외 설정에 따라 다릅니다.",16);
  text("이 검사는 앱 자체의 설정입니다. Chrome의 사이트 알림 권한과 제조사별 팝업 설정 전체를 읽는 검사는 아닙니다. 허용 상태라도 실제 팝업 표시는 별도 확인이 필요합니다.",16);
  button("Chrome 알림 설정 열기",v->open(appSettings("com.android.chrome")));
  text("기존 삼성 인터넷 기반 앱과 Chrome은 로그인과 알림 등록을 공유하지 않을 수 있습니다. 업데이트 후 사이트에 다시 로그인하고 이 기기 알림을 켜 주세요.",16);
  button("상태 다시 확인",v->render());
  button("사이트 열기",v->{
   if(!EntryActivity.hasChrome(this)){text("Chrome을 먼저 설치하거나 사용 설정해 주세요.",17);return;}
   getSharedPreferences("notification-diagnostics",MODE_PRIVATE).edit().putBoolean("seen-v3",true).apply();
   startActivity(new Intent(this,LauncherActivity.class).setData(EntryActivity.safeUrl(getIntent().getData())));finish();
  });
 }
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);render();}
}
