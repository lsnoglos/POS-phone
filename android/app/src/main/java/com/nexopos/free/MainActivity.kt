package com.nexopos.free

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import java.security.MessageDigest
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
    private var tab = "Inicio"
    private lateinit var ops:BusinessOps
    private val purchaseCart=linkedMapOf<String,PurchaseItem>()
    private var purchaseSupplierId:String?=null
    private var purchaseMethod="Contado"
    private var purchaseInvoice=""
    private var purchaseFreight="0"
    private val cart = linkedMapOf<String,Int>()
    private var saleQuery=""
    private var chosenCustomer: String? = null
    private var chosenMethod = "Efectivo"
    private var photoUri = ""
    private var photoChanged: ((String)->Unit)? = null
    private var pendingPdf = false
    private var google: GoogleCloud? = null
    private val cream = Color.rgb(16,19,16)
    private val surface = Color.rgb(29,33,28)
    private val terracotta = Color.rgb(244,183,131)
    private val ink = Color.rgb(248,244,235)
    private val muted = Color.rgb(183,172,159)
    private val tabs = listOf("Inicio","Venta","Inventario","Finanzas","Más")

    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor=cream
        window.navigationBarColor=Color.BLACK
        store=Store(this)
        ops=BusinessOps(store)
        google=GoogleCloud(this,store)
        try{
            val json=org.json.JSONObject(getSharedPreferences("nexo_cart",Context.MODE_PRIVATE).getString("pending", "{}")?:"{}")
            val keys=json.keys()
            while(keys.hasNext()){
                val id=keys.next();val qty=json.optInt(id)
                if(qty>0 && store.products().any{it.id==id})cart[id]=qty
            }
        }catch(_:Exception){}
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
        this.text=text;textSize=13f;setAllCaps(false);setTextColor(Color.BLACK)
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
            setColor(surface);cornerRadius=dp(12).toFloat();setStroke(dp(1),0xff5b5a51.toInt())
        }
        layoutParams=LinearLayout.LayoutParams(-1,dp(53)).apply{bottomMargin=dp(9)}
    }

    private fun card():LinearLayout=column().apply{
        setPadding(dp(13),dp(9),dp(13),dp(9))
        background=GradientDrawable().apply{setColor(surface);cornerRadius=dp(17).toFloat()}
    }
    private fun navigate(text:String,detail:String,dest:String){
        val item=card()
        item.addView(title(text,17f));item.addView(info(detail))
        item.setOnClickListener{tab=dest;render()}
        body.addView(item,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=dp(8)})
    }
    private fun stat(label:String,value:String):LinearLayout=card().apply{
        addView(info(label));addView(title(value,20f))
    }
    private fun render(){
        root.removeAllViews()
        val currentName=ops.setting("name","La pulpe")
        val header=row()
        header.addView(title("NEXO POS · "+currentName,20f),LinearLayout.LayoutParams(0,-2,1f))
        header.addView(btn("⚙"){tab="Configuración";render()},LinearLayout.LayoutParams(dp(48),dp(42)))
        root.addView(header)
        val scroll=ScrollView(this)
        body=column().apply{setPadding(0,dp(4),0,dp(18))}
        scroll.addView(body)
        root.addView(scroll,LinearLayout.LayoutParams(-1,0,1f))
        when(tab){
            "Inicio"->renderDashboard()
            "Venta"->renderSale()
            "Inventario"->renderInventory()
            "Finanzas"->renderFinance()
            "Más"->renderMore()
            "Compra"->renderPurchase()
            "Caja"->renderCash()
            "Clientes"->renderParties("cliente")
            "Proveedores"->renderParties("proveedor")
            "Historial"->renderHistory()
            "Google"->renderCloud()
            "Configuración"->renderSettings()
        }
        val nav=row()
        val selected=when(tab){
            "Compra","Caja"->"Finanzas"
            "Clientes","Proveedores","Historial","Google","Configuración"->"Más"
            else->tab
        }
        tabs.forEach{item->
            val action=btn(item){tab=item;render()}
            action.textSize=11f
            if(item==selected)action.setTextColor(Color.BLACK)
            else { action.setTextColor(ink); action.background=GradientDrawable().apply{setColor(surface);cornerRadius=dp(12).toFloat()} }
            nav.addView(action,LinearLayout.LayoutParams(0,dp(49),1f).apply{rightMargin=dp(3)})
        }
        root.addView(nav)
    }
    private fun renderDashboard(){
        val summary=ops.summary()
        body.addView(title("Panel de tu negocio",25f))
        val hero=card().apply{
            background=GradientDrawable().apply{setColor(0xff513822.toInt());cornerRadius=dp(17).toFloat()}
            addView(info("Ventas de hoy"));addView(title(money(summary.today),30f))
            addView(info("Ayer "+money(summary.yesterday)+" · Semana "+money(summary.week)))
        }
        body.addView(hero)
        body.addView(title("Accesos rápidos",19f))
        val actions=listOf(
            Triple("Nueva venta","Cobrar en el mostrador","Venta"),
            Triple("Nueva compra","Entrar mercancía","Compra"),
            Triple("Inventario","Productos, precios, QR","Inventario"),
            Triple("Caja y arqueo","Turnos y efectivo","Caja"))
        actions.chunked(2).forEach{pair->
            val line=row()
            pair.forEach{(label,detail,dest)->
                val item=card()
                item.addView(title(label,16f));item.addView(info(detail))
                item.setOnClickListener{tab=dest;render()}
                line.addView(item,LinearLayout.LayoutParams(0,dp(114),1f).apply{rightMargin=dp(7)})
            }
            body.addView(line,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=dp(7)})
        }
        body.addView(title("Resumen",19f))
        listOf(
            "Ventas del mes" to money(summary.month),
            "Ganancia bruta estimada" to money(summary.profit),
            "Por cobrar" to money(summary.receivable),
            "Por pagar" to money(summary.payable),
            "Compras del mes" to money(summary.purchases),
            "Inventario al costo" to money(summary.stockValue)
        ).chunked(2).forEach{pair->
            val line=row()
            pair.forEach{(label,value)->
                line.addView(stat(label,value),LinearLayout.LayoutParams(0,-2,1f).apply{rightMargin=dp(7)})
            }
            body.addView(line,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=dp(7)})
        }
        body.addView(info("Alertas: "+summary.lowStock+" productos con 3 unidades o menos."))
        body.addView(info(if(summary.openShift)"Caja abierta · esperado "+money(summary.cashExpected?:0L)
            else "Caja cerrada · abre un turno para registrar efectivo."))
        body.addView(info("Las cifras se calculan con los registros locales. Ganancia bruta no es utilidad neta."))
    }
    private fun renderFinance(){
        body.addView(title("Finanzas",25f))
        navigate("Caja y arqueo","Abrir y cerrar turnos, entradas y retiros","Caja")
        navigate("Compras","Recepción de mercancía y proveedores","Compra")
        navigate("Cuentas por cobrar","Fiados y abonos de clientes","Clientes")
        navigate("Proveedores","Cuentas por pagar","Proveedores")
        navigate("Historial de ventas","Registro de transacciones","Historial")
        body.addView(info("Libro diario, libro mayor y estados financieros completos siguen en desarrollo."))
    }
    private fun renderMore(){
        body.addView(title("Más opciones",25f))
        listOf(
            Triple("Clientes y fiados","Saldos, abonos y recordatorios","Clientes"),
            Triple("Proveedores","Contactos, productos vinculados y deudas","Proveedores"),
            Triple("Historial","Operaciones registradas","Historial"),
            Triple("Configuración","Datos y preferencias del negocio","Configuración"),
            Triple("Cuenta de Google","Sesión, Drive, Sheets y respaldos","Google")
        ).forEach{navigate(it.first,it.second,it.third)}
    }
    private fun rememberCart(){
        val json=org.json.JSONObject()
        cart.forEach{(id,qty)->json.put(id,qty)}
        getSharedPreferences("nexo_cart",Context.MODE_PRIVATE).edit()
            .putString("pending",json.toString()).apply()
    }
    private fun cartAdd(product:Product){
        if(product.qty<=0){toast("Sin existencias: "+product.name);return}
        val current=cart[product.id]?:0
        if(current>=product.qty){toast("Se alcanzó la existencia disponible");return}
        cart[product.id]=current+1
        rememberCart();render()
    }
    private fun renderSale(){
        body.addView(title("Nueva venta",25f))
        addButton(body,"▣  Escanear QR continuamente"){openScanner()}
        val search=field("Buscar producto, categoría, SKU o código",saleQuery)
        body.addView(search)
        body.addView(title("Carrito · "+cart.values.sum()+" artículos",20f))
        val list=store.products()
        val selected=card()
        var total=0L
        if(cart.isEmpty())selected.addView(info("Agregue productos desde el catálogo o utilice la cámara."))
        cart.toMap().forEach{(id,qty)->
            val product=list.firstOrNull{it.id==id}?:return@forEach
            total+=product.price*qty
            val row=row()
            row.addView(info(product.name+" × "+qty+"\n"+money(product.price*qty)),
                LinearLayout.LayoutParams(0,-2,1f))
            row.addView(btn("−"){
                if(qty<=1)cart.remove(id)else cart[id]=qty-1
                rememberCart();render()
            })
            row.addView(btn(qty.toString()){
                val amount=field("Cantidad",qty.toString(),true)
                AlertDialog.Builder(this).setTitle(product.name)
                    .setView(amount).setNegativeButton("Cancelar",null)
                    .setPositiveButton("Actualizar"){_,_->
                        val value=amount.text.toString().toIntOrNull()?:0
                        if(value in 1..product.qty){cart[id]=value;rememberCart();render()}
                        else toast("Ingrese entre 1 y "+product.qty+" unidades")
                    }.show()
            })
            row.addView(btn("+"){
                if(qty<product.qty){cart[id]=qty+1;rememberCart();render()}
                else toast("No hay más existencias")
            })
            selected.addView(row)
        }
        body.addView(selected)
        body.addView(title("Total: "+money(total),25f))
        addButton(body,"Cobrar · "+money(total)){
            if(cart.isEmpty())toast("Agregue productos al carrito")
            else checkoutDialog(total)
        }
        body.addView(title("Catálogo de productos",18f))
        val catalog=column()
        body.addView(catalog)
        fun filter(term:String){
            catalog.removeAllViews()
            val match=store.products().filter{p->
                term.isEmpty()||p.name.contains(term,true)||p.category.contains(term,true)||p.barcode.contains(term,true)
            }.sortedWith(compareByDescending<Product>{it.qty>0}.thenBy{it.name.lowercase()})
            match.take(if(term.isBlank())20 else 60).forEach{product->
                val r=card()
                val line=row()
                if(product.photo.isNotBlank()){
                    val image=ImageView(this).apply{
                        try{setImageURI(Uri.parse(product.photo))}catch(_:Exception){}
                        scaleType=ImageView.ScaleType.CENTER_CROP
                    }
                    line.addView(image,LinearLayout.LayoutParams(dp(56),dp(56)).apply{rightMargin=dp(10)})
                }
                val description=column()
                description.addView(title(product.name,16f))
                description.addView(info(money(product.price)+" · hay "+product.qty+
                    (if(product.category.isNotBlank())" · "+product.category else "")))
                line.addView(description,LinearLayout.LayoutParams(0,-2,1f))
                line.addView(btn("+"){cartAdd(product)})
                r.addView(line)
                catalog.addView(r,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=dp(5)})
            }
            if(match.isEmpty())catalog.addView(info("No se encontraron productos. Regístrelos en Inventario."))
        }
        filter(saleQuery)
        search.addTextChangedListener(simpleWatcher{value->saleQuery=value;filter(value)})
        body.addView(info("El carrito permanece guardado aunque cambie de pantalla o cierre accidentalmente la aplicación."))
    }
    private fun checkoutDialog(total:Long){
        val form=column().apply{setPadding(dp(13),dp(8),dp(13),dp(6))}
        val customers=store.parties("cliente")
        form.addView(info("Cliente"))
        val customersSpinner=Spinner(this).apply{
            adapter=ArrayAdapter(this@MainActivity,android.R.layout.simple_spinner_dropdown_item,
                listOf("Consumidor final")+customers.map{it.name})
            setSelection((customers.indexOfFirst{it.id==chosenCustomer}+1).coerceAtLeast(0))
        }
        form.addView(customersSpinner)
        form.addView(info("Forma de pago"))
        val methods=listOf("Efectivo","Transferencia","Tarjeta","Fiado")
        val methodsSpinner=Spinner(this).apply{
            adapter=ArrayAdapter(this@MainActivity,android.R.layout.simple_spinner_dropdown_item,methods)
            setSelection(methods.indexOf(chosenMethod).coerceAtLeast(0))
        }
        form.addView(methodsSpinner)
        val received=field("Efectivo recibido",BigDecimal.valueOf(total,2).toPlainString(),true)
        form.addView(received)
        form.addView(info("El efectivo recibido se utiliza únicamente para calcular el cambio en pagos al contado."))
        val dialog=AlertDialog.Builder(this).setTitle("Confirmar cobro · "+money(total))
            .setView(form).setNegativeButton("Cancelar",null)
            .setPositiveButton("Registrar venta",null).create()
        dialog.setOnShowListener{
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener{
                try{
                    val customerIndex=customersSpinner.selectedItemPosition
                    val customerId=if(customerIndex==0)null else customers[customerIndex-1].id
                    val payment=methods[methodsSpinner.selectedItemPosition]
                    if(payment=="Fiado")require(customerId!=null){"Seleccione un cliente registrado para fiar"}
                    val paid=if(payment=="Efectivo")cents(received.text.toString()) else total
                    require(paid>=total){"El efectivo recibido es insuficiente"}
                    val saved=store.charge(cart.toMap(),customerId,payment)
                    val change=if(payment=="Efectivo")paid-total else 0L
                    cart.clear();rememberCart();chosenCustomer=null;chosenMethod=payment
                    dialog.dismiss()
                    AlertDialog.Builder(this).setTitle("Venta registrada")
                        .setMessage("Comprobante "+saved.id.take(8)+"\nCliente: "+saved.customer+
                            "\nTotal: "+money(saved.total)+"\nMétodo: "+saved.method+
                            "\nCambio: "+money(change)+"\nGuardado en el teléfono.")
                        .setPositiveButton("Listo",null).show()
                    render()
                }catch(e:Exception){toast(e.message?:"No se pudo realizar el cobro")}
            }
        }
        dialog.show()
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
            if(type=="proveedor"&&p.balance>0L){
                addButton(body,"Abonar cuenta a "+p.name){
                    val amount=field("Monto del pago",numeric=true)
                    AlertDialog.Builder(this).setTitle("Abono a proveedor · "+p.name)
                        .setView(amount).setNegativeButton("Cancelar",null)
                        .setPositiveButton("Guardar pago"){_,_->
                            try{
                                ops.supplierPayment(p.id,cents(amount.text.toString()))
                                render();toast("Abono de proveedor registrado")
                            }catch(e:Exception){toast(e.message?:"Abono inválido")}
                        }.show()
                }
            }
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
                try{
                    val createdId=store.saveParty(type,name.text.toString(),phone.text.toString())
                    if(type=="proveedor"&&tab=="Compra")purchaseSupplierId=createdId
                    render()
                }catch(e:Exception){toast(e.message?:"Error de guardado")}
            }.show()
    }

    private fun renderPurchase(){
        body.addView(title("Nueva compra",24f))
        body.addView(info("Seleccione proveedor y agregue mercancía. El inventario se actualizará al recibirla."))
        val suppliers=store.parties("proveedor")
        body.addView(info("Proveedor"))
        val supplierSelect=Spinner(this)
        supplierSelect.adapter=ArrayAdapter(this,android.R.layout.simple_spinner_dropdown_item,
            listOf("Sin proveedor")+suppliers.map{it.name})
        supplierSelect.setSelection((suppliers.indexOfFirst{it.id==purchaseSupplierId}+1).coerceAtLeast(0))
        supplierSelect.onItemSelectedListener=object:android.widget.AdapterView.OnItemSelectedListener{
            override fun onNothingSelected(parent:android.widget.AdapterView<*>?){}
            override fun onItemSelected(parent:android.widget.AdapterView<*>?,view:View?,position:Int,id:Long){
                purchaseSupplierId=if(position==0)null else suppliers[position-1].id
            }
        }
        body.addView(supplierSelect,LinearLayout.LayoutParams(-1,dp(48)))
        addButton(body,"+ Registrar proveedor sin salir de la compra"){partyDialog("proveedor")}
        if(purchaseSupplierId!=null){
            val associated=ops.supplierProducts(purchaseSupplierId!!)
            body.addView(info("Productos comprados anteriormente a este proveedor: "+associated.size))
        }
        body.addView(title("Artículos de la compra",18f))
        purchaseCart.toMap().forEach{(key,item)->
            val box=card()
            box.addView(title(item.name,16f))
            box.addView(info(item.qty.toString()+" unidades × "+money(item.cost)+" = "+money(item.cost*item.qty)))
            val actions=row()
            actions.addView(btn("−"){
                if(item.qty<=1)purchaseCart.remove(key)
                else purchaseCart[key]=item.copy(qty=item.qty-1)
                render()
            })
            actions.addView(btn("+"){
                purchaseCart[key]=item.copy(qty=item.qty+1);render()
            })
            actions.addView(btn("Cantidad/costo"){editPurchaseLine(key,item)})
            actions.addView(btn("Quitar"){purchaseCart.remove(key);render()})
            box.addView(actions)
            body.addView(box,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=dp(7)})
        }
        val sum=purchaseCart.values.sumOf{it.cost*it.qty}
        body.addView(info("Subtotal mercancía: "+money(sum)))
        addButton(body,"+ Nuevo producto en esta compra"){newPurchaseItem()}
        body.addView(title("Agregar del inventario",18f))
        val search=field("Buscar producto registrado")
        body.addView(search)
        val list=column()
        body.addView(list)
        fun filter(query:String){
            list.removeAllViews()
            store.products().filter{it.name.contains(query,true)||it.barcode.contains(query,true)}
                .take(if(query.isEmpty())12 else 30).forEach{product->
                    val line=card()
                    line.addView(title(product.name,16f))
                    line.addView(info("Existencia: "+product.qty+" · costo: "+money(product.cost)))
                    line.addView(btn("+ Añadir a la compra"){
                        val old=purchaseCart[product.id]
                        purchaseCart[product.id]=if(old!=null)old.copy(qty=old.qty+1)
                            else PurchaseItem(product.id,product.name,product.category,1,product.cost,product.price)
                        render()
                    })
                    list.addView(line,LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=dp(6)})
                }
        }
        filter("")
        search.addTextChangedListener(object:TextWatcher{
            override fun beforeTextChanged(s:CharSequence?,start:Int,count:Int,after:Int){}
            override fun onTextChanged(s:CharSequence?,start:Int,before:Int,count:Int){filter(s.toString())}
            override fun afterTextChanged(s:Editable?){}
        })
        body.addView(title("Datos de la compra",18f))
        val invoice=field("Número de factura o referencia",purchaseInvoice)
        invoice.addTextChangedListener(simpleWatcher{purchaseInvoice=it})
        body.addView(invoice)
        val freight=field("Flete C$",purchaseFreight,true)
        freight.addTextChangedListener(simpleWatcher{purchaseFreight=it})
        body.addView(freight)
        val methods=listOf("Contado","Crédito")
        val methodSelect=Spinner(this)
        methodSelect.adapter=ArrayAdapter(this,android.R.layout.simple_spinner_dropdown_item,methods)
        methodSelect.setSelection(methods.indexOf(purchaseMethod))
        methodSelect.onItemSelectedListener=object:android.widget.AdapterView.OnItemSelectedListener{
            override fun onNothingSelected(parent:android.widget.AdapterView<*>?){}
            override fun onItemSelected(parent:android.widget.AdapterView<*>?,view:View?,position:Int,id:Long){
                purchaseMethod=methods[position]
            }
        }
        body.addView(methodSelect,LinearLayout.LayoutParams(-1,dp(45)))
        val freightValue=try{cents(purchaseFreight)}catch(_:Exception){0L}
        addButton(body,"Recibir mercancía · "+money(sum+freightValue)){
            try{
                val fee=cents(purchaseFreight)
                require(purchaseCart.isNotEmpty()){"Agregue productos"}
                require(purchaseMethod!="Crédito"||purchaseSupplierId!=null){"Seleccione proveedor para comprar a crédito"}
                AlertDialog.Builder(this).setTitle("Confirmar recepción")
                    .setMessage("Se aumentará el inventario de "+purchaseCart.size+
                        " productos y se registrará la compra por "+money(sum+fee)+".")
                    .setNegativeButton("Cancelar",null)
                    .setPositiveButton("Recibir"){_,_->
                        try{
                            val result=ops.purchase(purchaseSupplierId,purchaseCart.values.toList(),fee,
                                purchaseInvoice,purchaseMethod)
                            purchaseCart.clear();purchaseInvoice="";purchaseFreight="0"
                            toast("Compra registrada: "+money(result.total));render()
                        }catch(e:Exception){toast(e.message?:"No se pudo registrar la compra")}
                    }.show()
            }catch(e:Exception){toast(e.message?:"Datos incompletos")}
        }
        body.addView(title("Compras recientes",18f))
        ops.purchases().take(12).forEach{p->
            body.addView(info(p.date+" · "+p.supplier+" · "+money(p.total)+" · "+p.method))
        }
    }

    private fun simpleWatcher(action:(String)->Unit):TextWatcher=object:TextWatcher{
        override fun beforeTextChanged(s:CharSequence?,start:Int,count:Int,after:Int){}
        override fun onTextChanged(s:CharSequence?,start:Int,before:Int,count:Int){action(s.toString())}
        override fun afterTextChanged(s:Editable?){}
    }

    private fun newPurchaseItem(){
        val box=column().apply{setPadding(dp(10),dp(7),dp(10),0)}
        val name=field("Nombre del producto")
        val category=field("Categoría")
        val cost=field("Costo por unidad",numeric=true)
        val price=field("Precio de venta",numeric=true)
        val qty=field("Cantidad recibida","1",true)
        listOf(name,category,cost,price,qty).forEach{box.addView(it)}
        AlertDialog.Builder(this).setTitle("Producto nuevo en la compra").setView(box)
            .setNegativeButton("Cancelar",null).setPositiveButton("Añadir"){_,_->
                try{
                    val item=PurchaseItem(null,name.text.toString().trim(),category.text.toString().trim(),
                        qty.text.toString().toInt(),cents(cost.text.toString()),cents(price.text.toString()))
                    require(item.name.length>=2&&item.qty>0&&item.cost>=0&&item.salePrice>=0){"Revise los datos"}
                    purchaseCart[UUID.randomUUID().toString()]=item
                    render()
                }catch(e:Exception){toast(e.message?:"Producto inválido")}
            }.show()
    }

    private fun editPurchaseLine(key:String,item:PurchaseItem){
        val box=column().apply{setPadding(dp(12),dp(8),dp(12),0)}
        val qty=field("Cantidad",item.qty.toString(),true)
        val cost=field("Costo unitario",BigDecimal.valueOf(item.cost,2).toPlainString(),true)
        val price=field("Precio venta",BigDecimal.valueOf(item.salePrice,2).toPlainString(),true)
        listOf(qty,cost,price).forEach{box.addView(it)}
        AlertDialog.Builder(this).setTitle(item.name).setView(box)
            .setNegativeButton("Cancelar",null).setPositiveButton("Aplicar"){_,_->
                try{
                    val q=qty.text.toString().toInt()
                    val c=cents(cost.text.toString())
                    val p=cents(price.text.toString())
                    require(q in 1..99999&&c>=0&&p>=0){"Cantidad o precios inválidos"}
                    purchaseCart[key]=item.copy(qty=q,cost=c,salePrice=p)
                    render()
                }catch(e:Exception){toast(e.message?:"Valores incorrectos")}
            }.show()
    }

    private fun renderCash(){
        body.addView(title("Caja y arqueo",24f))
        val open=ops.openCash()
        if(open==null){
            body.addView(info("No hay un turno abierto. El fondo inicial no se registra como venta."))
            val initial=field("Efectivo inicial C$","0",true)
            body.addView(initial)
            addButton(body,"Abrir caja"){
                try{ops.startCash(cents(initial.text.toString()));render();toast("Caja abierta")}
                catch(e:Exception){toast(e.message?:"Fondo inválido")}
            }
            return
        }
        body.addView(stat("Efectivo esperado en el cajón",money(open.expected)))
        body.addView(info("Turno abierto: "+open.opened+" · fondo "+money(open.opening)))
        val amount=field("Monto de entrada o retiro C$",numeric=true)
        val reason=field("Motivo (obligatorio)")
        body.addView(amount);body.addView(reason)
        val commands=row()
        listOf("Entrada" to false,"Retiro" to true).forEach{(name,withdrawal)->
            commands.addView(btn(name){
                try{ops.cashMove(cents(amount.text.toString()),reason.text.toString(),withdrawal)
                    render();toast("Movimiento registrado")}
                catch(e:Exception){toast(e.message?:"Error del movimiento")}
            },LinearLayout.LayoutParams(0,dp(48),1f).apply{rightMargin=dp(7)})
        }
        body.addView(commands)
        body.addView(title("Movimientos del turno",18f))
        val movements=ops.cashMoves()
        if(movements.isEmpty())body.addView(info("Sin movimientos registrados."))
        movements.forEach{move->
            body.addView(info(move.date+" · "+move.kind+" · "+money(move.amount)+" · "+move.note))
        }
        val count=field("Efectivo contado al cierre C$",numeric=true)
        body.addView(count)
        addButton(body,"Cerrar caja y calcular diferencia"){
            try{
                val counted=cents(count.text.toString())
                AlertDialog.Builder(this).setTitle("Confirmar cierre de caja")
                    .setMessage("Contado: "+money(counted)+"\nEsperado: "+money(open.expected)+
                        "\nDiferencia: "+money(counted-open.expected)+
                        "\nEl turno se cerrará y quedará registrado.")
                    .setNegativeButton("Cancelar",null).setPositiveButton("Cerrar caja"){_,_->
                        try{ops.closeCash(counted);render();toast("Caja cerrada")}
                        catch(e:Exception){toast(e.message?:"No se pudo cerrar")}
                    }.show()
            }catch(e:Exception){toast("Ingrese el arqueo contado")}
        }
    }

    private fun renderSettings(){
        body.addView(title("Configuración del negocio",24f))
        val props=listOf(
            Triple("name","Nombre comercial","La pulpe"),
            Triple("address","Dirección",""),
            Triple("phone","Teléfono",""),
            Triple("tax_id","Identificación fiscal (opcional)",""),
            Triple("currency","Moneda","NIO"),
            Triple("credit_days","Días habituales de crédito","30"))
        val inputs=linkedMapOf<String,EditText>()
        props.forEach{(key,hint,default)->
            body.addView(info(hint))
            val box=field(hint,ops.setting(key,default),key=="credit_days")
            inputs[key]=box
            body.addView(box)
        }
        addButton(body,"Guardar configuración"){
            try{
                val data=inputs.mapValues{it.value.text.toString()}
                require(data.getValue("name").trim().isNotEmpty()){"Escriba el nombre comercial"}
                require(data.getValue("credit_days").toIntOrNull() in 0..365){"Días de crédito inválidos"}
                ops.saveSettings(data);render();toast("Configuración guardada localmente")
            }catch(e:Exception){toast(e.message?:"Datos inválidos")}
        }
        body.addView(info("Los datos del negocio se incluirán en el respaldo de Google Drive cuando esté conectado."))
        body.addView(info("Moneda para esta edición: Córdoba (C$). Antes de habilitar otra moneda deben adaptarse formatos y cálculos."))
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
    private fun installedSha1():String{
        return try{
            val pm=packageManager
            @Suppress("DEPRECATION")
            val p=if(Build.VERSION.SDK_INT>=28)
                pm.getPackageInfo(packageName,PackageManager.GET_SIGNING_CERTIFICATES)
            else pm.getPackageInfo(packageName,PackageManager.GET_SIGNATURES)
            @Suppress("DEPRECATION")
            val signature=if(Build.VERSION.SDK_INT>=28)p.signingInfo?.apkContentsSigners?.firstOrNull()
                else p.signatures?.firstOrNull()
            val bytes=signature?.toByteArray()?:return "No se pudo leer la firma"
            MessageDigest.getInstance("SHA-1").digest(bytes).joinToString(":"){b->
                "%02X".format(b.toInt() and 0xff)
            }
        }catch(_:Exception){"Firma no disponible"}
    }

    private fun renderCloud(){
        body.addView(title("Tu cuenta de Google"))
        val account=GoogleSignIn.getLastSignedInAccount(this)
        body.addView(info(account?.email ?: "No conectada. Puede usar esta versión local para probar el punto de venta."))
        val sha=installedSha1()
        body.addView(info("Identificador de la aplicación: "+packageName))
        body.addView(info("SHA-1 de este APK: "+sha))
        addButton(body,"Copiar datos para Google Cloud"){
            val data="Paquete: "+packageName+"\nSHA-1: "+sha
            (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                .setPrimaryClip(ClipData.newPlainText("NEXO POS OAuth Android",data))
            toast("Datos copiados para Google Cloud")
        }
        addButton(body,if(account==null)"Entrar con Google" else "Cambiar cuenta Google"){
            val options=GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail().build()
            GoogleSignIn.getClient(this,options).signInIntent.also{startActivityForResult(it,120)}
        }
        body.addView(info("Si aparece el error 10, configure Google Cloud → Clientes OAuth → Android con este paquete y el SHA-1 exacto mostrado arriba."))
        addButton(body,"Guardar registros en Google Sheets"){
            val signed=GoogleSignIn.getLastSignedInAccount(this)
            if(signed==null){toast("Primero entre con Google");return@addButton}
            val scope=Scope(GoogleCloud.DRIVE_SCOPE)
            if(!GoogleSignIn.hasPermissions(signed,scope)){
                GoogleSignIn.requestPermissions(this,121,signed,scope)
            }else{
                toast("Sincronizando con Google…")
                google?.pushToSheets(signed){message->runOnUiThread{toast(message)}}
            }
        }
        addButton(body,"Recuperar copia de seguridad de Drive"){
            val signed=GoogleSignIn.getLastSignedInAccount(this)
            if(signed==null){toast("Primero entre con Google");return@addButton}
            val scope=Scope(GoogleCloud.DRIVE_SCOPE)
            if(!GoogleSignIn.hasPermissions(signed,scope)){
                GoogleSignIn.requestPermissions(this,122,signed,scope)
                return@addButton
            }
            AlertDialog.Builder(this).setTitle("Restaurar datos desde Google")
                .setMessage("Se sustituirán TODOS los productos, ventas, clientes, fiados y abonos del teléfono por la última copia completa de NEXO POS en Drive. Este cambio no se puede deshacer. ¿Desea continuar?")
                .setNegativeButton("Cancelar",null)
                .setPositiveButton("Restaurar"){_,_->
                    toast("Recuperando la copia de Google Drive...")
                    google?.restoreFromDrive(signed){ok,message->
                        runOnUiThread{
                            if(ok){cart.clear();chosenCustomer=null;render()}
                            toast(message)
                        }
                    }
                }.show()
        }
        body.addView(info("Google Sheets: productos, ventas, detalle de ventas, clientes, proveedores y abonos."))
        body.addView(info("Google Calendar: desde Clientes puede preparar recordatorios de cobros, confirmándolos en su calendario."))
        body.addView(info("El teléfono conserva sus datos sin conexión. Sincronizar crea una copia JSON restaurable en Drive y actualiza la hoja de cálculo."))
        body.addView(info("IMPORTANTE: esta primera versión es experimental. No cargue ventas reales sin antes probar la recuperación desde la nube y la impresión."))
    }
    private fun openScanner(){
        val saved=org.json.JSONObject()
        cart.forEach{(id,qty)->saved.put(id,qty)}
        startActivityForResult(Intent(this,ContinuousScanActivity::class.java).putExtra("cart",saved.toString()),140)
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
        if(requestCode==140){
            if(resultCode==RESULT_OK){
                try{
                    val json=org.json.JSONObject(data?.getStringExtra("cart")?:"{}")
                    cart.clear()
                    val iterator=json.keys()
                    while(iterator.hasNext()){
                        val id=iterator.next()
                        val qty=json.optInt(id,0)
                        if(qty>0)cart[id]=qty
                    }
                }catch(e:Exception){toast("No se pudo recuperar el carrito del escáner")}
                rememberCart()
                tab="Venta";render()
            }
            return
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
                val email=account.email?:error("Google no devolvió el correo")
                val prefs=getSharedPreferences("nexo_google",Context.MODE_PRIVATE)
                val prior=prefs.getString("owner_email",null)
                if(prior!=null&&prior!=email){
                    AlertDialog.Builder(this).setTitle("Cuenta distinta")
                        .setMessage("Este negocio pertenece a "+prior+". Para evitar mezclar los datos, utilice esa misma cuenta.")
                        .setPositiveButton("Entendido",null).show()
                }else{
                    prefs.edit().putString("owner_email",email).apply()
                    toast("Google conectado: "+email)
                }
                render()
            }catch(e:ApiException){
                val code=e.statusCode
                val note=if(code==10)"Google rechazó esta aplicación (DEVELOPER_ERROR). Registre un cliente OAuth de tipo Android con el paquete "+packageName+" y SHA-1 "+installedSha1()+"."
                    else "Código "+code+". Verifique internet, Google Play Services y la autorización de la cuenta."
                AlertDialog.Builder(this).setTitle("No se pudo iniciar sesión con Google")
                    .setMessage(note).setPositiveButton("Entendido",null).show()
            }catch(e:Exception){
                AlertDialog.Builder(this).setTitle("Error de Google").setMessage(e.message?:"No se pudo iniciar sesión")
                    .setPositiveButton("Aceptar",null).show()
            }
            return
        }
        if(requestCode==121){
            if(resultCode==RESULT_OK){
                GoogleSignIn.getLastSignedInAccount(this)?.let{signed->
                    toast("Permiso concedido; sincronizando…")
                    google?.pushToSheets(signed){message->runOnUiThread{toast(message)}}
                }
            }else toast("No se autorizó el acceso a Drive")
            return
        }
        if(requestCode==122){
            if(resultCode==RESULT_OK)toast("Permiso concedido. Pulse Recuperar copia nuevamente para confirmar.")
            else toast("No se autorizó el acceso a Drive")
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
