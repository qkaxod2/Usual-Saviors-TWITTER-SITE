import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),jdk='C:/Program Files/Microsoft/jdk-21.0.10.7-hotspot';
const r=spawnSync(path.join(jdk,'bin/java.exe'),['-jar','C:/Users/Owner/.gradle/wrapper/dists/gradle-8.14.3-all/10utluxaxniiv4wxiphsi49nj/gradle-8.14.3/lib/gradle-gradle-cli-main-8.14.3.jar',':app:testDebugUnitTest','--no-daemon','--console=plain'],{cwd:path.join(root,'android'),env:{...process.env,JAVA_HOME:jdk,GRADLE_USER_HOME:path.join(root,'.local/gradle-home')},stdio:'inherit'});
process.exit(r.status??1);
