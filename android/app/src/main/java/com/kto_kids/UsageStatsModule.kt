package com.kto_kids

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class UsageStatsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "UsageStatsModule"

  @ReactMethod
  fun hasUsageStatsPermission(promise: Promise) {
    promise.resolve(hasPermission())
  }

  @ReactMethod
  fun openUsageAccessSettings() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun getUsageStats(startTime: Double, endTime: Double, promise: Promise) {
    if (!hasPermission()) {
      promise.reject("E_USAGE_PERMISSION", "Usage access permission is not granted")
      return
    }

    try {
      val usageStatsManager =
        reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager

      if (usageStatsManager == null) {
        promise.reject("E_USAGE_SERVICE", "Usage stats service unavailable")
        return
      }

      val stats =
        usageStatsManager.queryUsageStats(
          UsageStatsManager.INTERVAL_DAILY,
          startTime.toLong(),
          endTime.toLong()
        ) ?: emptyList()

      val packageManager = reactContext.packageManager
      val appArray = Arguments.createArray()

      stats
        .asSequence()
        .filter { it.packageName != reactContext.packageName }
        .filter { it.totalTimeInForeground > 0L }
        .sortedByDescending { it.totalTimeInForeground }
        .forEach { stat ->
          val appMap = Arguments.createMap()
          val appName =
            try {
              val appInfo = packageManager.getApplicationInfo(stat.packageName, 0)
              packageManager.getApplicationLabel(appInfo).toString()
            } catch (_: Exception) {
              stat.packageName
            }

          appMap.putString("packageName", stat.packageName)
          appMap.putString("appName", appName)
          appMap.putDouble("totalTimeMs", stat.totalTimeInForeground.toDouble())
          appMap.putDouble("totalTimeMinutes", stat.totalTimeInForeground.toDouble() / 60000.0)
          appMap.putDouble("lastTimeUsed", stat.lastTimeUsed.toDouble())
          appArray.pushMap(appMap)
        }

      promise.resolve(appArray)
    } catch (error: Exception) {
      promise.reject("E_USAGE_STATS", error.message, error)
    }
  }

  private fun hasPermission(): Boolean {
    val appOpsManager =
      reactContext.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false

    val mode =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOpsManager.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactContext.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOpsManager.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactContext.packageName
        )
      }

    if (mode == AppOpsManager.MODE_ALLOWED) {
      return true
    }

    val usageStatsManager =
      reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
        ?: return false

    val now = System.currentTimeMillis()
    val stats = usageStatsManager.queryUsageStats(
      UsageStatsManager.INTERVAL_DAILY,
      now - 60_000L,
      now
    )

    return !stats.isNullOrEmpty()
  }
}
