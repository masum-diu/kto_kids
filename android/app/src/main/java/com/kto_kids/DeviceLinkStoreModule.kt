package com.kto_kids

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceLinkStoreModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DeviceLinkStore"

  @ReactMethod
  fun setLinkedTrackId(trackId: String, promise: Promise) {
    try {
      val normalized = trackId.trim()
      if (normalized.isEmpty()) {
        promise.resolve(false)
        return
      }
      val prefs = reactApplicationContext.getSharedPreferences("kto_monitoring", Context.MODE_PRIVATE)
      prefs.edit().putString("linked_track_id", normalized).apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_LINK_STORE_SET", e.message, e)
    }
  }

  @ReactMethod
  fun getLinkedTrackId(promise: Promise) {
    try {
      val prefs = reactApplicationContext.getSharedPreferences("kto_monitoring", Context.MODE_PRIVATE)
      val value = prefs.getString("linked_track_id", null)
      promise.resolve(value)
    } catch (e: Exception) {
      promise.reject("E_LINK_STORE_GET", e.message, e)
    }
  }
}
