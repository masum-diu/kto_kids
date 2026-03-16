package com.kto_kids

import android.app.AppOpsManager
import android.app.usage.UsageEvents
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

      // INTERVAL_BEST gives better granularity for "today so far" than INTERVAL_DAILY
      val interval = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        UsageStatsManager.INTERVAL_BEST
      } else {
        UsageStatsManager.INTERVAL_DAILY
      }

      val stats =
        usageStatsManager.queryUsageStats(
          interval,
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

  /**
   * Uses queryUsageEvents to aggregate foreground time per app. Returns all apps that had
   * any foreground time in the range (no bucket limit like INTERVAL_DAILY can have).
   */
  @ReactMethod
  fun getUsageStatsFromEvents(startTime: Double, endTime: Double, promise: Promise) {
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

      val usageEvents = usageStatsManager.queryEvents(
        startTime.toLong(),
        endTime.toLong()
      ) ?: run {
        promise.resolve(Arguments.createArray())
        return
      }

      // Aggregate: ACTIVITY_RESUMED = 1 -> record start time; ACTIVITY_PAUSED = 2 / ACTIVITY_STOPPED = 3 -> add duration
      val packageTimeMs = mutableMapOf<String, Long>()
      val packageResumedMs = mutableMapOf<String, Long>()
      val event = UsageEvents.Event()
      val endMs = endTime.toLong()

      while (usageEvents.hasNextEvent()) {
        usageEvents.getNextEvent(event)
        val pkg = event.packageName ?: continue
        if (pkg == reactContext.packageName) continue

        when (event.eventType) {
          UsageEvents.Event.ACTIVITY_RESUMED -> {
            packageResumedMs[pkg] = event.timeStamp
          }
          UsageEvents.Event.ACTIVITY_PAUSED, UsageEvents.Event.ACTIVITY_STOPPED -> {
            val started = packageResumedMs.remove(pkg) ?: continue
            val duration = (event.timeStamp - started).coerceAtLeast(0L)
            packageTimeMs[pkg] = packageTimeMs.getOrDefault(pkg, 0L) + duration
          }
        }
      }

      // Add time for apps still in foreground (resumed but no pause yet)
      for ((pkg, started) in packageResumedMs) {
        val duration = (endMs - started).coerceAtLeast(0L)
        packageTimeMs[pkg] = packageTimeMs.getOrDefault(pkg, 0L) + duration
      }

      val packageManager = reactContext.packageManager
      val appArray = Arguments.createArray()

      packageTimeMs
        .filter { it.value > 0L }
        .toList()
        .sortedByDescending { it.second }
        .forEach { (pkg, timeMs) ->
          val appMap = Arguments.createMap()
          val appName =
            try {
              val appInfo = packageManager.getApplicationInfo(pkg, 0)
              packageManager.getApplicationLabel(appInfo).toString()
            } catch (_: Exception) {
              pkg
            }
          appMap.putString("packageName", pkg)
          appMap.putString("appName", appName)
          appMap.putDouble("totalTimeMs", timeMs.toDouble())
          appMap.putDouble("totalTimeMinutes", timeMs.toDouble() / 60000.0)
          appMap.putDouble("lastTimeUsed", 0.0)
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
