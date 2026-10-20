package com.nexopos.free

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.net.Uri
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import java.io.OutputStream

/** Letter-size 2 x 5 shelf labels; stable QR payloads contain product IDs, not stale prices. */
object LabelPdf {
    private val black=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.rgb(41,38,35)}
    private val border=Paint(Paint.ANTI_ALIAS_FLAG).apply{
        color=Color.rgb(175,175,175);style=Paint.Style.STROKE;strokeWidth=0.6f
    }
    private fun codeBitmap(id:String,size:Int):Bitmap{
        val matrix=QRCodeWriter().encode("nexo:p:"+id,BarcodeFormat.QR_CODE,size,size)
        val bitmap=Bitmap.createBitmap(size,size,Bitmap.Config.ARGB_8888)
        for(y in 0 until size)for(x in 0 until size){
            bitmap.setPixel(x,y,if(matrix.get(x,y))Color.BLACK else Color.WHITE)
        }
        return bitmap
    }
    fun export(context:Context,products:List<Product>,output:OutputStream){
        val doc=PdfDocument()
        try{
            val perPage=10
            for(pageIndex in 0 until (products.size+perPage-1)/perPage){
                val page=doc.startPage(PdfDocument.PageInfo.Builder(612,792,pageIndex+1).create())
                val canvas=page.canvas
                for(i in 0 until perPage){
                    val p=products.getOrNull(pageIndex*perPage+i)?:break
                    val col=i%2
                    val row=i/2
                    val x=16f+col*290f
                    val y=16f+row*151.6f
                    val width=288f
                    val height=149.6f
                    canvas.drawRoundRect(RectF(x,y,x+width,y+height),7f,7f,border)
                    canvas.drawText("NEXO POS",x+12,y+15,black.apply{textSize=9f;typeface=android.graphics.Typeface.DEFAULT_BOLD})
                    if(p.photo.isNotBlank()){
                        try{
                            val uri=Uri.parse(p.photo)
                            context.contentResolver.openInputStream(uri)?.use{input->
                                val pic=BitmapFactory.decodeStream(input)
                                if(pic!=null){
                                    canvas.drawBitmap(pic,null,RectF(x+12,y+22,x+86,y+96),null)
                                    pic.recycle()
                                }
                            }
                        }catch(_:Exception){/* Photo does not block printing. */}
                    }
                    val qr=codeBitmap(p.id,200)
                    canvas.drawBitmap(qr,null,RectF(x+width-102,y+20,x+width-16,y+106),null)
                    qr.recycle()
                    black.textSize=12f
                    black.typeface=android.graphics.Typeface.DEFAULT_BOLD
                    canvas.drawText(p.name.take(34),x+12,y+119,black)
                    black.textSize=17f
                    canvas.drawText("C$"+String.format(java.util.Locale.US,"%.2f",p.price/100.0),x+12,y+139,black)
                }
                doc.finishPage(page)
            }
            doc.writeTo(output)
        }finally{doc.close()}
    }
}
