package com.kto_kids

import android.content.Context
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.ExistingWorkPolicy
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class NativeMonitoringWorker(appContext: Context, params: WorkerParameters) :
  Worker(appContext, params) {

  override fun doWork(): Result {
    return try {
      val prefs = applicationContext.getSharedPreferences("kto_monitoring", Context.MODE_PRIVATE)
      val trackId = prefs.getString("linked_track_id", null)?.trim()
      if (!trackId.isNullOrEmpty()) {
        postHealthActivity(trackId)
      }
      NativeMonitoringScheduler.scheduleNext(applicationContext, 1)
      Result.success()
    } catch (e: Exception) {
      NativeMonitoringScheduler.scheduleNext(applicationContext, 1)
      Result.retry()
    }
  }

  private fun postHealthActivity(trackId: String) {
    val endpoint = "https://api.kto.solutions/api/v1/activities"
    val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
      requestMethod = "POST"
      connectTimeout = 15000
      readTimeout = 15000
      doOutput = true
      setRequestProperty("Content-Type", "application/json")
    }

    val today = java.time.LocalDate.now().toString()
    val payload = """
      {
        "trackId":"$trackId",
        "appName":"monitoring.native.worker",
        "packageName":"com.kto_kids.health",
        "durationMinutes":1,
        "activityDate":"$today"
      }
    """.trimIndent()

    OutputStreamWriter(connection.outputStream).use { writer ->
      writer.write(payload)
      writer.flush()
    }

    val code = connection.responseCode
    if (code !in 200..299) {
      throw IllegalStateException("Native worker upload failed: $code")
    }
  }
}

object NativeMonitoringScheduler {
  private const val UNIQUE_WORK_NAME = "kto_native_monitoring_work"

  fun scheduleNext(context: Context, minutes: Long) {
    val request =
      OneTimeWorkRequestBuilder<NativeMonitoringWorker>()
        .setInitialDelay(minutes, TimeUnit.MINUTES)
        .build()

    WorkManager.getInstance(context).enqueueUniqueWork(
      UNIQUE_WORK_NAME,
      ExistingWorkPolicy.REPLACE,
      request
    )
  }

  fun start(context: Context) {
    scheduleNext(context, 1)
  }
}
