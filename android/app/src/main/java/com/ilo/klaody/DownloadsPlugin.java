package com.ilo.klaody;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;


@CapacitorPlugin(name = "Downloads")
public class DownloadsPlugin extends Plugin {

  @PluginMethod
  public void saveToDownloads(PluginCall call) {
    String path = call.getString("path");
    String name = call.getString("name");
    String mimeType = call.getString("mimeType", "application/octet-stream");

    if (path == null || name == null) {
      call.reject("path and name are required");
      return;
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      call.reject("UNSUPPORTED");
      return;
    }

    File source = new File(Uri.parse(path).getPath());
    ContentResolver resolver = getContext().getContentResolver();

    ContentValues values = new ContentValues();
    values.put(MediaStore.Downloads.DISPLAY_NAME, name);
    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
    values.put(MediaStore.Downloads.IS_PENDING, 1);

    Uri target = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
    if (target == null) {
      call.reject("Could not create the file in Downloads");
      return;
    }

    try (InputStream in = new FileInputStream(source); OutputStream out = resolver.openOutputStream(target)) {
      if (out == null) throw new IllegalStateException("No output stream");
      byte[] buffer = new byte[64 * 1024];
      int read;
      while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
    } catch (Exception e) {
      resolver.delete(target, null, null);
      call.reject("Could not save the file: " + e.getMessage());
      return;
    }

    values.clear();
    values.put(MediaStore.Downloads.IS_PENDING, 0);
    resolver.update(target, values, null, null);
    source.delete(); // free the cache copy

    JSObject result = new JSObject();
    result.put("uri", target.toString());
    call.resolve(result);
  }
}
