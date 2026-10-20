package com.nexopos.free

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

data class Product(val id:String,val name:String,val category:String,val barcode:String,val cost:Long,val price:Long,val qty:Int,val photo:String)
data class Party(val id:String,val type:String,val name:String,val phone:String,val balance:Long)
data class Sale(val id:String,val date:String,val customer:String,val method:String,val total:Long)

class Store(context:Context):SQLiteOpenHelper(context,"nexo_local.db",null,1){
    override fun onCreate(db:SQLiteDatabase){
        db.execSQL("CREATE TABLE products(id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,barcode TEXT NOT NULL,cost INTEGER NOT NULL,price INTEGER NOT NULL,qty INTEGER NOT NULL CHECK(qty>=0),photo TEXT NOT NULL,updated TEXT NOT NULL)")
        db.execSQL("CREATE TABLE parties(id TEXT PRIMARY KEY,type TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,balance INTEGER NOT NULL DEFAULT 0)")
        db.execSQL("CREATE TABLE sales(id TEXT PRIMARY KEY,date TEXT NOT NULL,party_id TEXT,customer TEXT NOT NULL,method TEXT NOT NULL,total INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE lines(id TEXT PRIMARY KEY,sale_id TEXT NOT NULL,product_id TEXT NOT NULL,name TEXT NOT NULL,qty INTEGER NOT NULL,price INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE payments(id TEXT PRIMARY KEY,date TEXT NOT NULL,party_id TEXT NOT NULL,amount INTEGER NOT NULL)")
    }
    override fun onUpgrade(db:SQLiteDatabase,oldVersion:Int,newVersion:Int){
        if(oldVersion!=newVersion) error("Falta migración de versión $oldVersion")
    }
    private fun date()=SimpleDateFormat("yyyy-MM-dd HH:mm:ss",Locale.US).format(Date())
    @Synchronized fun products():List<Product>{
        val rows=mutableListOf<Product>()
        readableDatabase.rawQuery("SELECT id,name,category,barcode,cost,price,qty,photo FROM products ORDER BY name COLLATE NOCASE",null).use { c ->
            while(c.moveToNext()) rows.add(Product(c.getString(0),c.getString(1),c.getString(2),c.getString(3),c.getLong(4),c.getLong(5),c.getInt(6),c.getString(7)))
        }
        return rows
    }
    @Synchronized fun findCode(raw:String):Product? {
        val code=raw.trim()
        val id=code.removePrefix("nexo:p:")
        return products().firstOrNull { it.id==id || (it.barcode.isNotBlank() && it.barcode==code) }
    }
    @Synchronized fun saveProduct(p:Product){
        require(p.name.trim().length>=2){"Escriba el nombre"}
        require(p.cost>=0 && p.price>=0 && p.qty>=0){"Precio o cantidad inválidos"}
        val v=ContentValues().apply{
            put("id",p.id);put("name",p.name.trim());put("category",p.category.trim())
            put("barcode",p.barcode.trim());put("cost",p.cost);put("price",p.price)
            put("qty",p.qty);put("photo",p.photo);put("updated",date())
        }
        check(writableDatabase.insertWithOnConflict("products",null,v,SQLiteDatabase.CONFLICT_REPLACE)!=-1L)
    }
    @Synchronized fun parties(type:String):List<Party>{
        val rows=mutableListOf<Party>()
        readableDatabase.rawQuery("SELECT id,type,name,phone,balance FROM parties WHERE type=? ORDER BY name COLLATE NOCASE",arrayOf(type)).use { c ->
            while(c.moveToNext()) rows.add(Party(c.getString(0),c.getString(1),c.getString(2),c.getString(3),c.getLong(4)))
        }
        return rows
    }
    @Synchronized fun saveParty(type:String,name:String,phone:String){
        require(type=="cliente" || type=="proveedor")
        require(name.isNotBlank()){"Escriba el nombre"}
        writableDatabase.execSQL("INSERT INTO parties(id,type,name,phone,balance) VALUES(?,?,?,?,0)",arrayOf(UUID.randomUUID().toString(),type,name.trim(),phone.trim()))
    }
    @Synchronized fun sales():List<Sale>{
        val rows=mutableListOf<Sale>()
        readableDatabase.rawQuery("SELECT id,date,customer,method,total FROM sales ORDER BY date DESC",null).use { c ->
            while(c.moveToNext()) rows.add(Sale(c.getString(0),c.getString(1),c.getString(2),c.getString(3),c.getLong(4)))
        }
        return rows
    }
    /** Stock and sale commit atomically; no duplicate lines for repeated scans. */
    @Synchronized fun charge(cart:Map<String,Int>,partyId:String?,method:String):Sale{
        require(cart.isNotEmpty()){"El carrito está vacío"}
        require(method in listOf("Efectivo","Transferencia","Tarjeta","Fiado"))
        val db=writableDatabase
        db.beginTransaction()
        try{
            val picked=mutableListOf<Pair<Product,Int>>()
            var total=0L
            for((id,amount) in cart){
                require(amount in 1..99999){"Cantidad inválida"}
                val p=products().firstOrNull{it.id==id} ?: error("Producto no encontrado")
                require(p.qty>=amount){"Existencias insuficientes: "+p.name}
                total=Math.addExact(total,Math.multiplyExact(p.price,amount.toLong()))
                picked.add(p to amount)
            }
            val customer=partyId?.let{id->parties("cliente").firstOrNull{it.id==id}}
            if(method=="Fiado")require(customer!=null){"Seleccione un cliente para el fiado"}
            val id=UUID.randomUUID().toString()
            val at=date()
            db.execSQL("INSERT INTO sales(id,date,party_id,customer,method,total) VALUES(?,?,?,?,?,?)",
                arrayOf(id,at,customer?.id,customer?.name ?: "Consumidor final",method,total))
            for((p,qty) in picked){
                val st=db.compileStatement("UPDATE products SET qty=qty-?,updated=? WHERE id=? AND qty>=?")
                st.bindLong(1,qty.toLong());st.bindString(2,at);st.bindString(3,p.id);st.bindLong(4,qty.toLong())
                check(st.executeUpdateDelete()==1){"No hay suficientes existencias"}
                db.execSQL("INSERT INTO lines(id,sale_id,product_id,name,qty,price) VALUES(?,?,?,?,?,?)",
                    arrayOf(UUID.randomUUID().toString(),id,p.id,p.name,qty,p.price))
            }
            if(method=="Fiado")db.execSQL("UPDATE parties SET balance=balance+? WHERE id=?",arrayOf(total,customer!!.id))
            db.setTransactionSuccessful()
            return Sale(id,at,customer?.name ?: "Consumidor final",method,total)
        }finally{db.endTransaction()}
    }
    @Synchronized fun payment(partyId:String,amount:Long){
        require(amount>0){"Abono inválido"}
        val db=writableDatabase
        db.beginTransaction()
        try{
            val p=parties("cliente").firstOrNull{it.id==partyId} ?: error("Cliente no encontrado")
            require(amount<=p.balance){"El abono supera el saldo"}
            db.execSQL("INSERT INTO payments(id,date,party_id,amount) VALUES(?,?,?,?)",arrayOf(UUID.randomUUID().toString(),date(),partyId,amount))
            db.execSQL("UPDATE parties SET balance=balance-? WHERE id=?",arrayOf(amount,partyId))
            db.setTransactionSuccessful()
        }finally{db.endTransaction()}
    }
    /** Stable, complete cloud export, with schema metadata and IDs for recovery. */
    @Synchronized fun sheets():Map<String,List<List<String>>>{
        val specs=linkedMapOf(
            "Productos" to "SELECT id,name,category,barcode,cost,price,qty,photo,updated FROM products ORDER BY name",
            "Ventas" to "SELECT id,date,party_id,customer,method,total FROM sales ORDER BY date",
            "DetalleVentas" to "SELECT id,sale_id,product_id,name,qty,price FROM lines ORDER BY rowid",
            "Clientes" to "SELECT id,type,name,phone,balance FROM parties WHERE type='cliente' ORDER BY name",
            "Proveedores" to "SELECT id,type,name,phone,balance FROM parties WHERE type='proveedor' ORDER BY name",
            "Abonos" to "SELECT id,date,party_id,amount FROM payments ORDER BY date")
        val result=linkedMapOf<String,List<List<String>>>()
        for((name,sql) in specs){
            val values=mutableListOf<List<String>>()
            readableDatabase.rawQuery(sql,null).use{c->
                values.add((0 until c.columnCount).map{c.getColumnName(it)})
                while(c.moveToNext())values.add((0 until c.columnCount).map{if(c.isNull(it))"" else c.getString(it)})
            }
            result[name]=values
        }
        return result
    }
}
