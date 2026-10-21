package com.nexopos.free

import android.database.sqlite.SQLiteDatabase
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

private fun stamp():String=SimpleDateFormat("yyyy-MM-dd HH:mm:ss",Locale.US).format(Date())
data class PurchaseItem(val productId:String?,val name:String,val category:String,val qty:Int,val cost:Long,val salePrice:Long)
data class PurchaseRecord(val id:String,val date:String,val supplier:String,val total:Long,val method:String)
data class CashShift(val id:String,val opened:String,val opening:Long,val expected:Long,val operator:String)
data class CashShiftHistory(val id:String,val opened:String,val opening:Long,val closed:String?,val counted:Long?,val expected:Long,val operator:String)
data class FinanceSummary(
    val today:Long,val yesterday:Long,val week:Long,val month:Long,val profit:Long,
    val receivable:Long,val payable:Long,val purchases:Long,val lowStock:Int,val stockValue:Long,
    val cashExpected:Long?,val openShift:Boolean
)
data class CashMove(val id:String,val date:String,val kind:String,val amount:Long,val note:String)

/** Called inside an existing SQLite transaction; no session means no movement. */
internal fun Store.cashMovementInTransaction(db:SQLiteDatabase,kind:String,amount:Long,note:String,ref:String){
    val current=db.rawQuery("SELECT id FROM cash_sessions WHERE closed IS NULL ORDER BY opened DESC LIMIT 1",null)
        .use{ c->if(c.moveToFirst())c.getString(0) else null }
    if(current!=null && amount!=0L){
        db.execSQL("INSERT INTO cash_movements(id,session_id,date,kind,amount,note,reference) VALUES(?,?,?,?,?,?,?)",
            arrayOf(UUID.randomUUID().toString(),current,stamp(),kind,amount,note,ref))
    }
}

class BusinessOps(private val store:Store){
    private val db get()=store.writableDatabase
    private fun sum(sql:String,args:Array<String>?=null):Long=
        db.rawQuery(sql,args).use{c->if(c.moveToFirst())c.getLong(0) else 0L}
    private fun currentId():String?=
        db.rawQuery("SELECT id FROM cash_sessions WHERE closed IS NULL ORDER BY opened DESC LIMIT 1",null)
            .use{c->if(c.moveToFirst())c.getString(0) else null}

    @Synchronized fun setting(key:String,fallback:String=""):String=
        db.rawQuery("SELECT value FROM business_settings WHERE key=?",arrayOf(key))
            .use{c->if(c.moveToFirst())c.getString(0) else fallback}

    @Synchronized fun saveSettings(values:Map<String,String>){
        db.beginTransaction()
        try{
            values.forEach{(key,value)->
                require(key in listOf("name","address","phone","tax_id","currency","credit_days","logo")){"Configuración no reconocida"}
                db.execSQL("INSERT OR REPLACE INTO business_settings(key,value) VALUES(?,?)",arrayOf(key,value.trim()))
            }
            db.setTransactionSuccessful()
        }finally{db.endTransaction()}
    }

    @Synchronized fun summary():FinanceSummary{
        val now=SimpleDateFormat("yyyy-MM-dd",Locale.US).format(Date())
        val yesterday=SimpleDateFormat("yyyy-MM-dd",Locale.US).format(Date(System.currentTimeMillis()-86_400_000L))
        val weekStart=SimpleDateFormat("yyyy-MM-dd",Locale.US).format(Date(System.currentTimeMillis()-6*86_400_000L))
        val today=sum("SELECT COALESCE(SUM(total),0) FROM sales WHERE substr(date,1,10)=?",arrayOf(now))
        val yesterdayTotal=sum("SELECT COALESCE(SUM(total),0) FROM sales WHERE substr(date,1,10)=?",arrayOf(yesterday))
        val week=sum("SELECT COALESCE(SUM(total),0) FROM sales WHERE substr(date,1,10)>=?",arrayOf(weekStart))
        val month=sum("SELECT COALESCE(SUM(total),0) FROM sales WHERE substr(date,1,7)=?",arrayOf(now.take(7)))
        val profit=sum("SELECT COALESCE(SUM((price-cost)*qty),0) FROM lines l JOIN sales s ON s.id=l.sale_id WHERE substr(s.date,1,7)=?",arrayOf(now.take(7)))
        val recv=sum("SELECT COALESCE(SUM(balance),0) FROM parties WHERE type='cliente'")
        val pay=sum("SELECT COALESCE(SUM(balance),0) FROM parties WHERE type='proveedor'")
        val purchases=sum("SELECT COALESCE(SUM(total),0) FROM purchases WHERE substr(date,1,7)=?",arrayOf(now.take(7)))
        val low=sum("SELECT COUNT(*) FROM products WHERE qty<=3").toInt()
        val stock=sum("SELECT COALESCE(SUM(cost*qty),0) FROM products")
        return FinanceSummary(today,yesterdayTotal,week,month,profit,recv,pay,purchases,low,stock,
            openCash()?.expected,openCash()!=null)
    }

    @Synchronized fun supplierProducts(supplierId:String):Set<String>{
        val found=mutableSetOf<String>()
        db.rawQuery("SELECT product_id FROM product_suppliers WHERE supplier_id=?",arrayOf(supplierId))
            .use{c->while(c.moveToNext())found.add(c.getString(0))}
        return found
    }

    /** Receipt and stock update committed together; supplier debts are never inferred from price. */
    @Synchronized fun purchase(supplierId:String?,items:List<PurchaseItem>,freight:Long,invoice:String,method:String):PurchaseRecord{
        require(items.isNotEmpty()){"Seleccione productos o registre uno nuevo"}
        require(freight>=0){"Flete inválido"}
        require(method in setOf("Contado","Crédito")){"Forma de pago inválida"}
        val supplier=supplierId?.let{ id->store.parties("proveedor").firstOrNull{it.id==id} }
        if(method=="Crédito")require(supplier!=null){"Seleccione un proveedor para compra a crédito"}
        var total=freight
        items.forEach{
            require(it.name.isNotBlank()&&it.qty in 1..99999&&it.cost>=0&&it.salePrice>=0){"Revise las cantidades y precios"}
            total=Math.addExact(total,Math.multiplyExact(it.cost,it.qty.toLong()))
        }
        val id=UUID.randomUUID().toString()
        val at=stamp()
        db.beginTransaction()
        try{
            db.execSQL("INSERT INTO purchases(id,date,supplier_id,supplier_name,invoice,freight,method,total) VALUES(?,?,?,?,?,?,?,?)",
                arrayOf(id,at,supplier?.id,supplier?.name?:"Sin proveedor",invoice,freight,method,total))
            for(item in items){
                val saved=item.productId?.let{p->store.products().firstOrNull{it.id==p}}
                val pid=saved?.id?:UUID.randomUUID().toString()
                if(saved==null){
                    store.saveProduct(Product(pid,item.name,item.category,"",item.cost,item.salePrice,item.qty,""))
                }else{
                    db.execSQL("UPDATE products SET qty=qty+?,cost=?,price=?,updated=? WHERE id=?",
                        arrayOf(item.qty,item.cost,item.salePrice,at,pid))
                }
                db.execSQL("INSERT INTO purchase_lines(id,purchase_id,product_id,name,qty,cost) VALUES(?,?,?,?,?,?)",
                    arrayOf(UUID.randomUUID().toString(),id,pid,item.name,item.qty,item.cost))
                if(supplier!=null){
                    db.execSQL("INSERT OR REPLACE INTO product_suppliers(product_id,supplier_id,last_cost,updated) VALUES(?,?,?,?)",
                        arrayOf(pid,supplier.id,item.cost,at))
                }
            }
            if(method=="Crédito")
                db.execSQL("UPDATE parties SET balance=balance+? WHERE id=?",arrayOf(total,supplier!!.id))
            else store.cashMovementInTransaction(db,"COMPRA",-total,"Compra: "+(supplier?.name?:"sin proveedor"),id)
            db.setTransactionSuccessful()
            return PurchaseRecord(id,at,supplier?.name?:"Sin proveedor",total,method)
        }finally{db.endTransaction()}
    }

    @Synchronized fun purchases():List<PurchaseRecord>{
        val result=mutableListOf<PurchaseRecord>()
        db.rawQuery("SELECT id,date,supplier_name,total,method FROM purchases ORDER BY date DESC LIMIT 100",null).use{c->
            while(c.moveToNext())result.add(PurchaseRecord(c.getString(0),c.getString(1),
                c.getString(2),c.getLong(3),c.getString(4)))
        }
        return result
    }

    @Synchronized fun purchaseDetail(id:String):String{
        val header=db.rawQuery("SELECT date,supplier_name,invoice,freight,method,total FROM purchases WHERE id=?",arrayOf(id)).use{cursor->
            if(!cursor.moveToFirst())return "Compra no encontrada"
            "Fecha: "+cursor.getString(0)+"\nProveedor: "+cursor.getString(1)+
                "\nFactura: "+cursor.getString(2)+"\nFlete: C$"+(cursor.getLong(3)/100.0)+
                "\nPago: "+cursor.getString(4)+"\nTotal: C$"+(cursor.getLong(5)/100.0)
        }
        val lines=mutableListOf<String>()
        db.rawQuery("SELECT name,qty,cost FROM purchase_lines WHERE purchase_id=? ORDER BY name",arrayOf(id)).use{cursor->
            while(cursor.moveToNext())lines.add(cursor.getString(0)+" × "+cursor.getInt(1)+
                " · C$"+(cursor.getLong(2)/100.0)+" c/u")
        }
        return header+"\n\nProductos:\n"+lines.joinToString("\n").ifEmpty{"Sin detalle"}
    }

    @Synchronized fun supplierPayment(supplierId:String,amount:Long){
        require(amount>0){"Ingrese un abono válido"}
        db.beginTransaction()
        try{
            val supplier=store.parties("proveedor").firstOrNull{it.id==supplierId}
                ?:error("Proveedor no encontrado")
            require(amount<=supplier.balance){"El abono supera la deuda"}
            db.execSQL("UPDATE parties SET balance=balance-? WHERE id=?",arrayOf(amount,supplierId))
            db.execSQL("INSERT INTO supplier_payments(id,date,party_id,amount) VALUES(?,?,?,?)",
                arrayOf(UUID.randomUUID().toString(),stamp(),supplierId,amount))
            store.cashMovementInTransaction(db,"PAGO_PROVEEDOR",-amount,"Abono a "+supplier.name,supplierId)
            db.setTransactionSuccessful()
        }finally{db.endTransaction()}
    }

    @Synchronized fun openCash():CashShift? {
        val id=currentId()?:return null
        val result=db.rawQuery("SELECT opened,opening FROM cash_sessions WHERE id=?",arrayOf(id))
            .use{c->if(c.moveToFirst())Pair(c.getString(0),c.getLong(1)) else null}?:return null
        val movement=sum("SELECT COALESCE(SUM(amount),0) FROM cash_movements WHERE session_id=?",arrayOf(id))
        return CashShift(id,result.first,result.second,Math.addExact(result.second,movement),db.rawQuery("SELECT operator FROM cash_sessions WHERE id=?",arrayOf(id)).use{q->if(q.moveToFirst())q.getString(0) else "No registrado"})
    }

    @Synchronized fun startCash(initial:Long,operator:String){
        require(initial>=0){"Fondo inicial inválido"}
        require(currentId()==null){"Ya hay una caja abierta"}
        db.execSQL("INSERT INTO cash_sessions(id,opened,opening,operator) VALUES(?,?,?,?)",
            arrayOf(UUID.randomUUID().toString(),stamp(),initial,operator))
    }

    @Synchronized fun cashMove(amount:Long,reason:String,withdrawal:Boolean){
        require(amount>0&&reason.trim().isNotEmpty()){"Ingrese monto y motivo"}
        db.beginTransaction()
        try{
            val session=openCash()?:error("Abra caja primero")
            if(withdrawal)require(session.expected>=amount){"El retiro supera el efectivo esperado"}
            store.cashMovementInTransaction(db,if(withdrawal)"RETIRO" else "ENTRADA",
                if(withdrawal)-amount else amount,reason.trim(),"")
            db.setTransactionSuccessful()
        }finally{db.endTransaction()}
    }

    @Synchronized fun closeCash(counted:Long):Long{
        require(counted>=0){"Arqueo inválido"}
        db.beginTransaction()
        try{
            val session=openCash()?:error("No hay caja abierta")
            db.execSQL("UPDATE cash_sessions SET closed=?,counted=?,expected=? WHERE id=?",
                arrayOf(stamp(),counted,session.expected,session.id))
            db.setTransactionSuccessful()
            return counted-session.expected
        }finally{db.endTransaction()}
    }

    @Synchronized fun cashHistory():List<CashShiftHistory>{
        val rows=mutableListOf<CashShiftHistory>()
        db.rawQuery("SELECT id,opened,opening,closed,counted,expected,operator FROM cash_sessions ORDER BY opened DESC",null).use{cursor->
            while(cursor.moveToNext()){
                val id=cursor.getString(0)
                val expected=if(cursor.isNull(5))cursor.getLong(2)+sum("SELECT COALESCE(SUM(amount),0) FROM cash_movements WHERE session_id=?",arrayOf(id)) else cursor.getLong(5)
                rows.add(CashShiftHistory(id,cursor.getString(1),cursor.getLong(2),if(cursor.isNull(3))null else cursor.getString(3),if(cursor.isNull(4))null else cursor.getLong(4),expected,cursor.getString(6)))
            }
        }
        return rows
    }
    @Synchronized fun cashMoves(id:String):List<CashMove>{
        val result=mutableListOf<CashMove>()
        db.rawQuery("SELECT id,date,kind,amount,note FROM cash_movements WHERE session_id=? ORDER BY date DESC",arrayOf(id)).use{cursor->
            while(cursor.moveToNext())result.add(CashMove(cursor.getString(0),cursor.getString(1),cursor.getString(2),cursor.getLong(3),cursor.getString(4)))
        }
        return result
    }
    @Synchronized fun cashMoves():List<CashMove>{
        val id=currentId()?:return emptyList()
        val result=mutableListOf<CashMove>()
        db.rawQuery("SELECT id,date,kind,amount,note FROM cash_movements WHERE session_id=? ORDER BY date DESC",arrayOf(id)).use{c->
            while(c.moveToNext())result.add(CashMove(c.getString(0),c.getString(1),c.getString(2),c.getLong(3),c.getString(4)))
        }
        return result
    }
}
