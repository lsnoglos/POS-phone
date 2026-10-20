package com.nexopos.free

import android.accounts.Account
import android.app.Activity
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.UserRecoverableAuthException
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

/**
 * No paid backend or embedded client secret. Google's OAuth authorization runs
 * on the device; only app-created Drive files are accessible (drive.file).
 * Local SQLite is the authoritative checkout ledger; Sheets is its human-readable mirror.
 */
class GoogleCloud(private val activity: Activity,private val store: Store){
    companion object{
        const val DRIVE_SCOPE="https://www.googleapis.com/auth/drive.file"
        const val CALENDAR_SCOPE="https://www.googleapis.com/auth/calendar.events"
    }
    private val prefs=activity.getSharedPreferences("nexo_google",0)
    private val thread=Executors.newSingleThreadExecutor()
    private val drive="https://www.googleapis.com/drive/v3/files"
    private val sheets="https://sheets.googleapis.com/v4/spreadsheets"

    fun pushToSheets(account:GoogleSignInAccount,done:(String)->Unit){
        thread.execute {
            try{
                val email=account.email ?: error("La cuenta no tiene correo")
                val token=GoogleAuthUtil.getToken(activity,Account(email,"com.google"),"oauth2:$DRIVE_SCOPE")
                val root=folder(token,"NEXO POS",null)
                val imageRoot=folder(token,"Imágenes",root)
                val spreadsheet=sheet(token,root)
                val original=store.sheets()
                val photos=mutableMapOf<String,String>()
                var photoErrors=0
                for(p in store.products()){
                    if(p.photo.isBlank())continue
                    val key="photo_"+email+"_"+p.id
                    val known=prefs.getString(key,null)
                    if(known!=null){
                        photos[p.id]="drive:"+known
                        continue
                    }
                    try{
                        val category=folder(token,p.category.ifBlank{"Sin categoría"}.take(65),imageRoot)
                        val photoId=uploadPhoto(token,p,category)
                        prefs.edit().putString(key,photoId).apply()
                        photos[p.id]="drive:"+photoId
                    }catch(_:Exception){photoErrors++}
                }
                val data=JSONArray()
                for((tab,rows) in original){
                    val values=JSONArray()
                    rows.forEachIndexed { index,row->
                        val dataRow=JSONArray()
                        row.forEachIndexed{col,value->
                            val mapped=if(tab=="Productos"&&index>0&&col==7)photos[row[0]]?:value else value
                            dataRow.put(mapped)
                        }
                        values.put(dataRow)
                    }
                    data.put(JSONObject().put("range",tab+"!A1").put("values",values))
                }
                request(token,"POST",sheets+"/"+spreadsheet+"/values:batchUpdate",
                    JSONObject().put("valueInputOption","RAW").put("data",data).toString())
                prefs.edit().putString("sheet_"+email,spreadsheet).apply()
                done("Sincronizado con Google Sheets. "+original.size+" tablas. "+
                    if(photoErrors>0)"Fotos pendientes: $photoErrors" else "Fotos guardadas en Drive.")
            }catch(e:UserRecoverableAuthException){
                activity.runOnUiThread{activity.startActivityForResult(e.intent,151)}
                done("Google requiere autorización adicional. Concédala e intente sincronizar otra vez.")
            }catch(e:Exception){
                done("No se pudo sincronizar. Los datos locales siguen intactos. "+(e.message?:""))
            }
        }
    }
    private fun enc(raw:String)=URLEncoder.encode(raw,"UTF-8")
    private fun request(token:String,method:String,url:String,body:String?=null):String{
        val con=URL(url).openConnection() as HttpURLConnection
        try{
            con.requestMethod=method
            con.setRequestProperty("Authorization","Bearer "+token)
            con.setRequestProperty("Accept","application/json")
            con.connectTimeout=14000
            con.readTimeout=25000
            if(body!=null){
                con.doOutput=true
                con.setRequestProperty("Content-Type","application/json; charset=utf-8")
                con.outputStream.use{it.write(body.toByteArray(Charsets.UTF_8))}
            }
            val code=con.responseCode
            val result=(if(code in 200..299)con.inputStream else con.errorStream)?.bufferedReader()?.use{it.readText()}?:""
            if(code !in 200..299)throw IllegalStateException("Google API devolvió "+code+": "+result.take(200))
            return result
        }finally{con.disconnect()}
    }
    private fun folder(token:String,name:String,parent:String?):String{
        val where="name = '"+name.replace("'","\\'")+"' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"+
            (if(parent!=null)" and '"+parent+"' in parents" else " and 'root' in parents")
        val result=JSONObject(request(token,"GET",drive+"?q="+enc(where)+"&fields=files(id,name)&pageSize=100"))
        val rows=result.optJSONArray("files")
        if(rows!=null&&rows.length()>0)return rows.getJSONObject(0).getString("id")
        val meta=JSONObject().put("name",name).put("mimeType","application/vnd.google-apps.folder")
        if(parent!=null)meta.put("parents",JSONArray().put(parent))
        return JSONObject(request(token,"POST",drive+"?fields=id",meta.toString())).getString("id")
    }
    private fun sheet(token:String,root:String):String{
        val title="NEXO POS - Libro del negocio"
        val where="name = '"+title+"' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
        val existing=JSONObject(request(token,"GET",drive+"?q="+enc(where)+"&fields=files(id,name)&pageSize=50"))
            .optJSONArray("files")
        if(existing!=null&&existing.length()>0)return existing.getJSONObject(0).getString("id")
        val tabs=JSONArray()
        listOf("Productos","Ventas","DetalleVentas","Clientes","Proveedores","Abonos").forEach{
            tabs.put(JSONObject().put("properties",JSONObject().put("title",it)))
        }
        val sheetId=JSONObject(request(token,"POST",sheets,
            JSONObject().put("properties",JSONObject().put("title",title)).put("sheets",tabs).toString()))
            .getString("spreadsheetId")
        // Keep the spreadsheet with its photographs under one Drive folder.
        try{
            val meta=JSONObject(request(token,"GET",drive+"/"+sheetId+"?fields=parents"))
            val parents=meta.optJSONArray("parents")
            val old=if(parents!=null&&parents.length()>0)parents.getString(0) else null
            val url=drive+"/"+sheetId+"?addParents="+enc(root)+(if(old!=null)"&removeParents="+enc(old) else "")+"&fields=id"
            request(token,"PATCH",url,"{}")
        }catch(_:Exception){/* Spreadsheet stays accessible in My Drive. */}
        return sheetId
    }
    private fun uploadPhoto(token:String,product:Product,parent:String):String{
        val uri=Uri.parse(product.photo)
        val bytes=ByteArrayOutputStream()
        activity.contentResolver.openInputStream(uri)?.use{input->
            val opts=BitmapFactory.Options().apply{inSampleSize=2}
            val bitmap=BitmapFactory.decodeStream(input,null,opts) ?: error("Foto inválida")
            bitmap.compress(Bitmap.CompressFormat.JPEG,78,bytes)
            bitmap.recycle()
        }?:error("No se pudo abrir la fotografía")
        val boundary="NexoBoundaryCloudUpload"
        val metadata=JSONObject().put("name",product.id+".jpg").put("parents",JSONArray().put(parent))
            .put("mimeType","image/jpeg")
        val data=ByteArrayOutputStream()
        data.write(("--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+
            metadata.toString()+"\r\n--"+boundary+"\r\nContent-Type: image/jpeg\r\n\r\n").toByteArray())
        data.write(bytes.toByteArray())
        data.write(("\r\n--"+boundary+"--").toByteArray())
        val con=URL("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id")
            .openConnection() as HttpURLConnection
        try{
            con.requestMethod="POST"
            con.setRequestProperty("Authorization","Bearer "+token)
            con.setRequestProperty("Content-Type","multipart/related; boundary="+boundary)
            con.connectTimeout=18000;con.readTimeout=30000
            con.doOutput=true
            con.outputStream.use{it.write(data.toByteArray())}
            val status=con.responseCode
            val result=(if(status in 200..299)con.inputStream else con.errorStream)?.bufferedReader()?.use{it.readText()}?:""
            if(status !in 200..299)error("Error de Google Drive: "+status+" "+result.take(120))
            return JSONObject(result).getString("id")
        }finally{con.disconnect()}
    }
}
