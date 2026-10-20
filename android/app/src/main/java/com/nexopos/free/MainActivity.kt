package com.nexopos.free

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.provider.CalendarContract
import android.text.Editable
import android.text.TextWatcher
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.*
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.Scope
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.Scopes
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.zxing.integration.android.IntentIntegrator
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

class MainActivity : Activity() {
    private lateinit var store: Store
    private lateinit var root: LinearLayout
    private lateinit var body: LinearLayout
    private var tab = "Venta"
    private val cart = linkedMapOf<String,Int>()
    private var chosenCustomer: String? = null
    private var chosenMethod = "Efectivo"
    private var photoUri = ""
    private var photoChanged: ((String)->Unit)? = null
    private var pendingPdf = false
    private var google: GoogleCloud? = null
    private val cream = Color.rgb(246,244,238)
    private val terracotta = Color.rgb(223,151,93)
    private val ink = Color.rgb(40,38,35)
    private val muted = Color.rgb(104,103,99)
    private val tabs = listOf("Venta","Inventario","Clientes","Proveedores","Historial","Google")

    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor=ink
        window.navigationBarColor=Color.BLACK
        store=Store(this)
        google=GoogleCloud(this,store)
        root=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL;setBackgroundColor(cream)
            setPadding(dp(12),dp(10),dp(12),dp(8))
        }
        setContentView(root)
        render()
    }
    private fun dp(i:Int)=(i*resources.displayMetrics.density).toInt()
    private fun money(cents:Long):String = "C$"+BigDecimal.valueOf(cents,2).setScale(2).toPlainString()
    private fun cents(raw:String):Long {
        val n=raw.trim().replace(",",".")
        return (n.ifEmpty{"0"}).toBigDecimal().multiply(BigDecimal(100)).setScale(0,RoundingMode.HALF_UP).longValueExact()
    }
    private fun toast(s:String)=Toast.makeText(this,s,Toast.LENGTH_LONG).show()
    private fun title(s:String,size:Float=20f):TextView=TextView(this).apply{
        text=s;textSize=size;setTextColor(ink);typeface=Typeface.DEFAULT_BOLD
        setPadding(0,dp(9),0,dp(6))
    }
    private fun info(s:String):TextView=TextView(this).apply{
        text=s;textSize=14f;setTextColor(muted);setPadding(0,dp(5),0,dp(6))
    }
    private fun column():LinearLayout=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL}
    private fun row():LinearLayout=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL}
    private fun btn(text:String,action:()->Unit):Button=Button(this).apply{
        this.text=text;textSize=13f;setAllCaps(false);setTextColor(ink)
        background=GradientDrawable().apply{setColor(terracotta);cornerRadius=dp(14).toFloat()}
        setPadding(dp(10),dp(8),dp(10),dp(8))
        setOnClickListener{action()}
    }
    private fun addButton(where:LinearLayout,label:String,action:()->Unit){
        where.addView(btn(label,action),LinearLayout.LayoutParams(-1,dp(48)).apply{topMargin=dp(6)})
    }
    private fun field(hint:String,value:String="",numeric:Boolean=false):EditText=EditText(this).apply{
        this.hint=hint;setText(value);textSize=16f;setSingleLine(true)
        setTextColor(ink);setHintTextColor(muted)
        if(numeric)inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
        setPadding(dp(12),dp(5),dp(12),dp(5))
        background=GradientDrawable().apply{
            setColor(Color.WHITE);cornerRadius=dp(12).toFloat();setStroke(dp(1),0xffdedbd1.toInt())
        }
        layoutParams=LinearLayout.LayoutParams(-1,dp(53)).apply{bottomMargin=dp(9)}
    }
    private fun render(){
        root.removeAllViews()
        root.addView(title("NEXO POS  ·  La pulpe",24f))
        root.addView(info("Pruebas Android · datos locales · sin servidor de pago"))
        val horizontal=HorizontalScrollView(this)
        horizontal.isHorizontalScrollBarEnabled=false
        val nav=row()
        tabs.forEach{item->
            val button=btn(item){tab=item;render()}
            if(item==tab)button.setTextColor(Color.WHITE)
            else button.background=GradientDrawable().apply{setColor(0xffe8e5de.toInt());cornerRadius=dp(13).toFloat()}
            nav.addView(button,LinearLayout.LayoutParams(-2,dp(44)).apply{rightMargin=dp(5)})
        }
        horizontal.addView(nav);root.addView(horizontal)
        val scroll=ScrollView(this)
        body=column().apply{setPadding(0,dp(8),0,dp(24))}
        scroll.addView(body)
        root.addView(scroll,LinearLayout.LayoutParams(-1,0,1f))
        when(tab){
            "Venta"->renderSale()
            "Inventario"->renderInventory()
            "Clientes"->renderParties("cliente")
            "Proveedores"->renderParties("proveedor")
            "Historial"->renderHistory()
            "Google"->renderCloud()
        }
    }
    private fun cartAdd(product:Product){
        if(product.qty<=0){toast("Sin existencias: "+product.name);return}
        val current=cart[product.id]?:0
        if(current>=product.qty){toast("Se alcanzó la existencia disponible");return}
        cart[product.id]=current+1
        render()
    }
    private fun renderSale(){
        body.addView(title("Nueva venta"))
        val scan=btn("Escanear QR o código de barras"){openScanner()}
        body.addView(scan,LinearLayout.LayoutParams(-1,dp(50)))
        val search=field("Buscar producto o código…")
        body.addView(search)
        val productsBox=column()
        body.addView(productsBox)
        fun draw(filter:String){
            productsBox.removeAllViews()
            val found=store.products().filter{it.name.contains(filter,true)||it.barcode.contains(filter,true)}
            found.take(30).forEach{p->
                val line=row()
                val desc=info(p.name+"  ·  "+money(p.price)+"  ·  hay "+p.qty)
                line.addView(desc,LinearLayout.LayoutParams(0,-2,1f))
                line.addView(btn("+ Agregar"){cartAdd(p)})
                productsBox.addView(line)
            }
            if(found.isEmpty())productsBox.addView(info("No hay productos para mostrar."))
        }
        draw("")
        search.addTextChangedListener(object:TextWatcher{
            override fun beforeTextChanged(s:CharSequence?,start:Int,count:Int,after:Int){}
            override fun onTextChanged(s:CharSequence?,start:Int,before:Int,count:Int){draw(s.toString())}
            override fun afterTextChanged(s:Editable?){}
        })
        body.addView(title("Carrito ("+cart.values.sum()+" productos)"))
        var total=0L
        cart.toMap().forEach{(id,qty)->
            val p=store.products().firstOrNull{it.id==id}?:return@forEach
            total+=p.price*qty
            val line=row()
            line.addView(info(p.name+" × "+qty+"  ·  "+money(p.price*qty)),LinearLayout.LayoutParams(0,-2,1f))
            line.addView(btn("−"){
                if(qty==1)cart.remove(id) else cart[id]=qty-1
                render()
            })
            line.addView(btn("+"){
                if(qty<p.qty)cart[id]=qty+1 else toast("Sin existencias adicionales")
                render()
            })
            body.addView(line)
        }
        body.addView(title("Total: "+money(total),24f))
        val customers=store.parties("cliente")
        body.addView(info("Cliente:"))
        val customerNames=listOf("Consumidor final")+customers.map{it.name}
        val customerSelect=Spinner(this)
        customerSelect.adapter=ArrayAdapter(this,android.R.layout.simple_spinner_dropdown_item,customerNames)
        val pos=customers.indexOfFirst{it.id==chosenCustomer}
        customerSelect.setSelection(if(pos<0)0 else pos+1)
        customerSelect.onItemSelectedListener=object:android.widget.AdapterView.OnItemSelectedListener{
            override fun onNothingSelected(parent:android.widget.AdapterView<*>?){}
            override fun onItemSelected(parent:android.widget.AdapterView<*>?,view:View?,position:Int,id:Long){
                chosenCustomer=if(position==0)null else customers[position-1].id
            }
        }
        body.addView(customerSelect,LinearLayout.LayoutParams(-1,dp(50)))
        body.addView(info("Método de pago:"))
        val methods=listOf("Efectivo","Transferencia","Tarjeta","Fiado")
        val methodSelect=Spinner(this)
        methodSelect.adapter=ArrayAdapter(this,android.R.layout.simple_spinner_dropdown_item,methods)
        methodSelect.setSelection(methods.indexOf(chosenMethod))
        methodSelect.onItemSelectedListener=object:android.widget.AdapterView.OnItemSelectedListener{
            override fun onNothingSelected(parent:android.widget.AdapterView<*>?){}
            override fun onItemSelected(parent:android.widget.AdapterView<*>?,view:View?,position:Int,id:Long){chosenMethod=methods[position]}
        }
        body.addView(methodSelect,LinearLayout.LayoutParams(-1,dp(50)))
        addButton(body,"Cobrar · "+money(total)){
            if(cart.isEmpty()){toast("Agregue un producto");return@addButton}
            if(chosenMethod=="Fiado" && chosenCustomer==null){toast("Seleccione un cliente para el fiado");return@addButton}
            val cash=field("Efectivo recibido",BigDecimal.valueOf(total,2).toPlainString(),true)
            val confirm=AlertDialog.Builder(this).setTitle("Confirmar venta · "+money(total))
            if(chosenMethod=="Efectivo")confirm.setView(cash)
            confirm.setNegativeButton("Cancelar",null)
            confirm.setPositiveButton("Cobrar"){_,_->
                try{
                    if(chosenMethod=="Efectivo" && cents(cash.text.toString())<total){
                        toast("Efectivo insuficiente");return@setPositiveButton
                    }
                    val result=store.charge(cart.toMap(),chosenCustomer,chosenMethod)
                    cart.clear();chosenCustomer=null
                    val change=if(result.method=="Efectivo")cents(cash.text.toString())-result.total else 0L
                    AlertDialog.Builder(this).setTitle("Venta registrada").setMessage(
                        "N.º: "+result.id.take(8)+"\nTotal: "+money(result.total)+"\nCambio: "+money(change)+
                        "\nGuardada en el teléfono. Sincronice desde Google."
                    ).setPositiveButton("Aceptar",null).show()
                    render()
                }catch(e:Exception){toast(e.message?:"No se pudo registrar la venta")}
            }
            confirm.show()
        }
        body.addView(info("Si escanea el mismo QR varias veces, se incrementa una única línea del carrito."))
    }
    private fun renderInventory(){
        body.addView(title("Inventario"))
        addButton(body,"+ Registrar producto"){productDialog(null)}
        addButton(body,"Generar hoja carta con etiquetas QR"){createPdf()}
        val list=store.products()
        body.addView(info("Registrados: "+list.size+". Pulse un producto para editar sus datos."))
        list.forEach{p->
            val block=column()
            block.addView(title(p.name,17f))
            block.addView(info("Costo "+money(p.cost)+" · Venta "+money(p.price)+" · existencias "+p.qty))
            if(p.category.isNotBlank())block.addView(info("Categoría: "+p.category))
            val actions=row()
            actions.addView(btn("Editar"){productDialog(p)})
            actions.addView(btn("Añadir al carrito"){cartAdd(p);tab="Venta";render()})
            block.addView(actions)
            body.addView(block)
        }
    }
    private fun productDialog(existing:Product?){
        val wrapper=column().apply{setPadding(dp(14),dp(8),dp(14),0)}
        val name=field("Nombre",existing?.name?:"")
        val cost=field("Precio del proveedor",existing?.let{BigDecimal.valueOf(it.cost,2).toPlainString()}?:"",true)
        val price=field("Precio de venta",existing?.let{BigDecimal.valueOf(it.price,2).toPlainString()}?:"",true)
        val qty=field("Cantidad en inventario",existing?.qty?.toString()?:"0",true)
        listOf(name,cost,price,qty).forEach{wrapper.addView(it)}
        val detail=column()
        val category=field("Categoría",existing?.category?:"")
        val barcode=field("Código de barras (opcional)",existing?.barcode?:"")
        detail.addView(category);detail.addView(barcode)
        detail.visibility=View.GONE
        wrapper.addView(btn("Más detalles  ▾"){detail.visibility=if(detail.visibility==View.VISIBLE)View.GONE else View.VISIBLE})
        wrapper.addView(detail)
        var photo=existing?.photo?:""
        wrapper.addView(btn("Foto desde galería"){
            photoChanged={value->photo=value;toast("Fotografía seleccionada")}
            val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply{
                addCategory(Intent.CATEGORY_OPENABLE);type="image/*"
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
            }
            startActivityForResult(intent,110)
        })
        val scroll=ScrollView(this).apply{addView(wrapper)}
        AlertDialog.Builder(this).setTitle(if(existing==null)"Nuevo producto" else "Editar producto")
            .setView(scroll).setNegativeButton("Cancelar",null).setNeutralButton("Guardar y otro"){_,_->
                try{
                    store.saveProduct(Product(existing?.id?:UUID.randomUUID().toString(),name.text.toString(),category.text.toString(),
                        barcode.text.toString(),cents(cost.text.toString()),cents(price.text.toString()),qty.text.toString().toInt(),photo))
                    productDialog(null)
                    render()
                }catch(e:Exception){toast(e.message?:"Datos inválidos")}
            }.setPositiveButton("Guardar"){_,_->
                try{
                    store.saveProduct(Product(existing?.id?:UUID.randomUUID().toString(),name.text.toString(),category.text.toString(),
                        barcode.text.toString(),cents(cost.text.toString()),cents(price.text.toString()),qty.text.toString().toInt(),photo))
                    render();toast("Producto guardado")
                }catch(e:Exception){toast(e.message?:"Datos inválidos")}
            }.show()
    }
    private fun renderParties(type:String){
        body.addView(title(if(type=="cliente")"Clientes y fiados" else "Proveedores"))
        addButton(body,"+ Registrar "+type){partyDialog(type)}
        store.parties(type).forEach{p->
            body.addView(title(p.name,17f))
            body.addView(info("Teléfono: "+p.phone+" · saldo: "+money(p.balance)))
            if(type=="cliente" && p.balance>0L){
                addButton(body,"Recordar cobro en Google Calendar"){
                    val whenAt=System.currentTimeMillis()+24L*60L*60L*1000L
                    val event=Intent(Intent.ACTION_INSERT).setData(CalendarContract.Events.CONTENT_URI)
                        .putExtra(CalendarContract.Events.TITLE,"Cobrar a "+p.name)
                        .putExtra(CalendarContract.Events.DESCRIPTION,"Saldo pendiente en NEXO POS: "+money(p.balance))
                        .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME,whenAt)
                        .putExtra(CalendarContract.EXTRA_EVENT_END_TIME,whenAt+30L*60L*1000L)
                    try{startActivity(event)}catch(_:Exception){toast("No hay una aplicación Calendar disponible")}
                }
                addButton(body,"Registrar abono de "+p.name){
                val input=field("Importe abonado",numeric=true)
                AlertDialog.Builder(this).setTitle("Abonar cuenta").setView(input)
                    .setNegativeButton("Cancelar",null).setPositiveButton("Guardar"){_,_->
                        try{store.payment(p.id,cents(input.text.toString()));render();toast("Abono registrado")}
                        catch(e:Exception){toast(e.message?:"Abono inválido")}
                    }.show()
            }
            }
        }
    }
    private fun partyDialog(type:String){
        val box=column().apply{setPadding(dp(12),0,dp(12),0)}
        val name=field("Nombre")
        val phone=field("Teléfono")
        box.addView(name);box.addView(phone)
        AlertDialog.Builder(this).setTitle("Nuevo "+type).setView(box).setNegativeButton("Cancelar",null)
            .setPositiveButton("Guardar"){_,_->
                try{store.saveParty(type,name.text.toString(),phone.text.toString());render()}
                catch(e:Exception){toast(e.message?:"Error de guardado")}
            }.show()
    }
    private fun renderHistory(){
        body.addView(title("Ventas registradas"))
        val sales=store.sales()
        body.addView(info("Ventas locales: "+sales.size))
        sales.forEach{s->
            body.addView(title(money(s.total)+" · "+s.method,17f))
            body.addView(info(s.date+" · "+s.customer+" · "+s.id.take(8)))
        }
    }
    private fun renderCloud(){
        body.addView(title("Tu cuenta de Google"))
        val account=GoogleSignIn.getLastSignedInAccount(this)
        body.addView(info(account?.email ?: "No conectada. Puede usar esta versión local para probar el punto de venta."))
        addButton(body,if(account==null)"Entrar con Google" else "Cambiar cuenta"){
            val options=GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestScopes(Scope(GoogleCloud.DRIVE_SCOPE))
                .build()
            GoogleSignIn.getClient(this,options).signInIntent.also{startActivityForResult(it,120)}
        }
        addButton(body,"Guardar registros en Google Sheets"){
            val signed=GoogleSignIn.getLastSignedInAccount(this)
            if(signed==null){toast("Primero entre con Google");return@addButton}
            toast("Sincronizando. No cierre la aplicación.")
            google?.pushToSheets(signed){message->runOnUiThread{toast(message)}}
        }
        body.addView(info("Google Sheets: productos, ventas, detalle de ventas, clientes, proveedores y abonos."))
        body.addView(info("Google Calendar: desde Clientes puede preparar recordatorios de cobros, confirmándolos en su calendario."))
        body.addView(info("El teléfono conserva su base de datos aun cuando no tenga conexión. La sincronización utiliza tu permiso de Google Drive."))
        body.addView(info("IMPORTANTE: esta primera versión es experimental. No cargue ventas reales sin antes probar la recuperación desde la nube y la impresión."))
    }
    private fun openScanner(){
        IntentIntegrator(this).setDesiredBarcodeFormats(IntentIntegrator.ALL_CODE_TYPES)
            .setPrompt("Escanee el QR del estante o el código de barras")
            .setBeepEnabled(true).setOrientationLocked(false).initiateScan()
    }
    private fun createPdf(){
        if(store.products().isEmpty()){toast("Registre productos primero");return}
        pendingPdf=true
        val intent=Intent(Intent.ACTION_CREATE_DOCUMENT).apply{
            addCategory(Intent.CATEGORY_OPENABLE);type="application/pdf"
            putExtra(Intent.EXTRA_TITLE,"nexo-etiquetas-carta.pdf")
        }
        startActivityForResult(intent,130)
    }
    @Deprecated("Legacy activity-result bridge for the experimental APK")
    override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?){
        super.onActivityResult(requestCode,resultCode,data)
        if(requestCode==110 && resultCode==RESULT_OK && data?.data!=null){
            val uri=data.data!!
            try{contentResolver.takePersistableUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION)}
            catch(_:Exception){}
            photoChanged?.invoke(uri.toString());photoChanged=null;return
        }
        if(requestCode==130){
            pendingPdf=false
            if(resultCode==RESULT_OK && data?.data!=null){
                try{
                    contentResolver.openOutputStream(data.data!!)?.use{stream->
                        LabelPdf.export(this,store.products(),stream)
                    }
                    toast("Etiquetas guardadas en PDF")
                }catch(e:Exception){toast("Error al exportar etiquetas: "+e.message)}
            }
            return
        }
        if(requestCode==120){
            try{
                val account=GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException::class.java)
                toast("Google conectado: "+(account.email?:"Cuenta autorizada"));render()
            }catch(e:Exception){toast("No se inició sesión. Verifique el cliente OAuth Android y su certificado SHA-1.")}
            return
        }
        val scan=IntentIntegrator.parseActivityResult(requestCode,resultCode,data)
        if(scan!=null && scan.contents!=null){
            val p=store.findCode(scan.contents)
            if(p==null)toast("No existe un producto con este QR") else cartAdd(p)
            tab="Venta";render()
        }
    }
}
