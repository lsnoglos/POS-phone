package com.nexopos.free

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.SystemClock
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.google.zxing.ResultPoint
import org.json.JSONObject
import java.util.Locale

/**
 * A continuous camera scanner. Scan callbacks never record financial transactions;
 * they change only the cart returned to MainActivity. A barcode must disappear
 * from successful detections for at least 1.8s before it is counted again.
 */
class ContinuousScanActivity:Activity(){
    private lateinit var db:Store
    private lateinit var scanner:DecoratedBarcodeView
    private lateinit var cartText:LinearLayout
    private lateinit var message:TextView
    private val cart=linkedMapOf<String,Int>()
    private var lastCode=""
    private var lastSeenAt=0L
    private var lastProduct:String?=null
    private val paper=0xfff3eee5.toInt()
    private val dark=0xff131713.toInt()
    private val accent=0xfff3b783.toInt()

    private fun dp(value:Int)=(value*resources.displayMetrics.density).toInt()
    private fun label(value:String,size:Float=16f):TextView=TextView(this).apply{
        text=value;textSize=size;setTextColor(paper);setPadding(dp(6),dp(6),dp(6),dp(6))
    }
    private fun button(value:String,action:()->Unit):Button=Button(this).apply{
        text=value;textSize=13f;isAllCaps=false;setTextColor(Color.BLACK)
        background=GradientDrawable().apply{setColor(accent);cornerRadius=dp(12).toFloat()}
        setOnClickListener{action()}
    }
    override fun onCreate(savedInstanceState:Bundle?){
        super.onCreate(savedInstanceState)
        window.statusBarColor=dark
        window.navigationBarColor=dark
        window.decorView.systemUiVisibility=0
        db=Store(this)
        try{
            val raw=JSONObject(intent.getStringExtra("cart")?:"{}")
            val keys=raw.keys()
            while(keys.hasNext()){
                val id=keys.next()
                val q=raw.optInt(id,0)
                if(q>0&&db.products().any{it.id==id})cart[id]=q
            }
        }catch(_:Exception){}
        val root=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL;setPadding(dp(12),dp(10),dp(12),dp(8))
            setBackgroundColor(dark)
        }
        setContentView(root)
        root.setOnApplyWindowInsetsListener{view,insets->
            val bars=if(android.os.Build.VERSION.SDK_INT>=30)
                insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            else null
            val top=bars?.top ?: 0
            val bottom=bars?.bottom ?: 0
            view.setPadding(dp(12),dp(10)+top,dp(12),dp(12)+bottom)
            insets
        }
        root.requestApplyInsets()
        root.addView(label("Escanear productos",24f).apply{typeface=Typeface.DEFAULT_BOLD})
        root.addView(label("El carrito permanece activo. Retire cada QR antes de volver a leerlo.",13f))
        scanner=DecoratedBarcodeView(this)
        root.addView(scanner,LinearLayout.LayoutParams(-1,0,1.2f))
        message=label("Apunte la cámara a una etiqueta QR",14f)
        root.addView(message)
        val scroll=android.widget.ScrollView(this)
        cartText=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL}
        scroll.addView(cartText)
        root.addView(scroll,LinearLayout.LayoutParams(-1,0,0.8f))
        val manual=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL}
        val code=EditText(this).apply{
            hint="Escribir código";setSingleLine(true);textSize=15f
            setTextColor(paper);setHintTextColor(0xffa99e92.toInt())
            layoutParams=LinearLayout.LayoutParams(0,dp(50),1f)
        }
        manual.addView(code)
        manual.addView(button("Añadir"){read(code.text.toString());code.text.clear()})
        root.addView(manual)
        root.addView(button("Volver a venta / cobrar"){finishWithCart()},
            LinearLayout.LayoutParams(-1,dp(50)).apply{topMargin=dp(10)})
        scanner.decodeContinuous(object:BarcodeCallback{
            override fun barcodeResult(result:BarcodeResult){
                val value=result.text?.trim()?:return
                val now=SystemClock.elapsedRealtime()
                val sameVisible=value==lastCode&&now-lastSeenAt<1800L
                lastCode=value
                lastSeenAt=now
                if(sameVisible)return
                read(value)
            }
            override fun possibleResultPoints(points:MutableList<ResultPoint>){}
        })
        updateCart()
        if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)scanner.resume()
        else requestPermissions(arrayOf(Manifest.permission.CAMERA),301)
    }
    private fun read(raw:String){
        val p=db.findCode(raw)
        if(p==null){message.text="Código desconocido. Registre primero el producto.";return}
        val current=cart[p.id]?:0
        if(current>=p.qty){message.text="No hay más existencias de "+p.name;return}
        cart[p.id]=current+1
        lastProduct=p.id
        message.text="✓ "+p.name+" agregado · "+(current+1)+" unidad(es)"
        updateCart()
    }
    private fun updateCart(){
        cartText.removeAllViews()
        var total=0L
        for((id,count) in cart.toMap()){
            val p=db.products().firstOrNull{it.id==id}?:continue
            total+=p.price*count
            val line=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL}
            line.addView(label(p.name+" × "+count,14f),LinearLayout.LayoutParams(0,-2,1f))
            line.addView(button("−"){
                if(count==1)cart.remove(id) else cart[id]=count-1
                updateCart()
            })
            line.addView(button("+"){
                if(count<p.qty)cart[id]=count+1
                else Toast.makeText(this,"Sin existencias adicionales",Toast.LENGTH_SHORT).show()
                updateCart()
            })
            cartText.addView(line)
        }
        val totalText=label("Carrito · "+cart.values.sum()+" unidades · C$"+String.format(Locale.US,"%.2f",total/100.0),17f)
        totalText.typeface=Typeface.DEFAULT_BOLD
        cartText.addView(totalText)
    }
    private fun finishWithCart(){
        val data=JSONObject()
        cart.forEach{(id,qty)->data.put(id,qty)}
        setResult(RESULT_OK,Intent().putExtra("cart",data.toString()))
        finish()
    }
    @Deprecated("Use onBackPressedDispatcher for future versions")
    override fun onBackPressed(){finishWithCart()}
    override fun onPause(){
        super.onPause()
        if(::scanner.isInitialized)scanner.pause()
    }
    override fun onResume(){
        super.onResume()
        if(::scanner.isInitialized&&checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)
            scanner.resume()
    }
    override fun onRequestPermissionsResult(requestCode:Int,permissions:Array<out String>,grantResults:IntArray){
        super.onRequestPermissionsResult(requestCode,permissions,grantResults)
        if(requestCode==301){
            if(grantResults.firstOrNull()==PackageManager.PERMISSION_GRANTED)scanner.resume()
            else message.text="Sin permiso de cámara. Puede introducir el código manualmente."
        }
    }
}
