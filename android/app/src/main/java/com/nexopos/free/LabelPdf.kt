package com.nexopos.free

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.net.Uri
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import java.io.OutputStream
import java.util.Locale
import kotlin.math.min

/** Physical letter-size shelf labels. The QR stores the immutable internal ID, never the price. */
object LabelPdf {
    data class Layout(
        val columns:Int=2,val rows:Int=5,val copies:Int=1,
        val marginMm:Float=10f,val gapMm:Float=2f,
        val showPhoto:Boolean=true,val showBusiness:Boolean=true
    ){
        fun validated():Layout{
            require(columns in 1..4 && rows in 1..10 && copies in 1..50){"Columnas, filas o copias fuera de rango"}
            require(marginMm in 4f..20f && gapMm in 0f..8f){"Márgenes inválidos"}
            return this
        }
    }
    private val black=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.rgb(32,32,32)}
    private val border=Paint(Paint.ANTI_ALIAS_FLAG).apply{
        color=Color.rgb(175,175,175);style=Paint.Style.STROKE;strokeWidth=0.65f
    }
    private fun barcode(text:String,size:Int):Bitmap{
        val m=QRCodeWriter().encode(text,BarcodeFormat.QR_CODE,size,size)
        return Bitmap.createBitmap(size,size,Bitmap.Config.ARGB_8888).also{bitmap->
            for(y in 0 until size)for(x in 0 until size)
                bitmap.setPixel(x,y,if(m.get(x,y))Color.BLACK else Color.WHITE)
        }
    }
    private fun short(text:String,width:Float,paint:Paint):String{
        var candidate=text
        while(candidate.isNotEmpty() && paint.measureText(candidate)>width)
            candidate=candidate.dropLast(1)
        return if(candidate.length<text.length&&candidate.length>2)candidate.dropLast(1)+"…" else candidate
    }

    fun export(context:Context,products:List<Product>,output:OutputStream,
               options:Layout=Layout(),businessName:String="NEXO POS"){
        val o=options.validated()
        require(products.isNotEmpty()){"No hay productos seleccionados"}
        val doc=PdfDocument()
        val pageWidth=612f
        val pageHeight=792f
        val mm=72f/25.4f
        val margin=o.marginMm*mm
        val gap=o.gapMm*mm
        val cellWidth=(pageWidth-2*margin-(o.columns-1)*gap)/o.columns
        val cellHeight=(pageHeight-2*margin-(o.rows-1)*gap)/o.rows
        require(cellWidth>=72f && cellHeight>=52f){"Etiquetas demasiado pequeñas"}
        val ordered=products.flatMap{p->List(o.copies){p}}
        val itemsPerPage=o.columns*o.rows
        try{
            for(pageIdx in 0 until (ordered.size+itemsPerPage-1)/itemsPerPage){
                val page=doc.startPage(PdfDocument.PageInfo.Builder(612,792,pageIdx+1).create())
                val canvas=page.canvas
                for(i in 0 until itemsPerPage){
                    val p=ordered.getOrNull(pageIdx*itemsPerPage+i)?:break
                    val col=i%o.columns
                    val row=i/o.columns
                    val x=margin+col*(cellWidth+gap)
                    val y=margin+row*(cellHeight+gap)
                    canvas.drawRoundRect(RectF(x,y,x+cellWidth,y+cellHeight),4f,4f,border)
                    val pad=min(9f,cellWidth*0.045f)
                    var top=y+pad+8f
                    if(o.showBusiness){
                        black.textSize=min(9f,cellHeight*0.12f)
                        black.typeface=android.graphics.Typeface.DEFAULT_BOLD
                        canvas.drawText(short(businessName,cellWidth-2*pad,black),x+pad,top,black)
                        top+=5f
                    }
                    val reserved=min(29f,cellHeight*0.33f)
                    val visualArea=cellHeight-(top-y)-reserved-pad
                    val qrSize=min(min(cellWidth*0.35f,visualArea),68f).coerceAtLeast(18f)
                    val photoSize=if(o.showPhoto)qrSize else 0f
                    if(photoSize>0f&&p.photo.isNotBlank()&&!p.photo.startsWith("drive:")){
                        try{
                            context.contentResolver.openInputStream(Uri.parse(p.photo))?.use{input->
                                val opts=BitmapFactory.Options().apply{inSampleSize=2}
                                val pic=BitmapFactory.decodeStream(input,null,opts)
                                if(pic!=null){
                                    canvas.drawBitmap(pic,null,RectF(x+pad,top+2,x+pad+photoSize,top+photoSize+2),null)
                                    pic.recycle()
                                }
                            }
                        }catch(_:Exception){/* Missing photo must not block QR printing. */}
                    }
                    val qr=barcode("nexo:p:"+p.id,256)
                    val qx=x+cellWidth-pad-qrSize
                    canvas.drawBitmap(qr,null,RectF(qx,top+2,qx+qrSize,top+qrSize+2),null)
                    qr.recycle()
                    val nameY=y+cellHeight-reserved+7f
                    black.typeface=android.graphics.Typeface.DEFAULT_BOLD
                    black.textSize=min(11f,cellHeight*0.135f)
                    canvas.drawText(short(p.name,cellWidth-2*pad,black),x+pad,nameY,black)
                    black.textSize=min(16f,cellHeight*0.19f)
                    canvas.drawText("C$"+String.format(Locale.US,"%.2f",p.price/100.0),x+pad,
                        (y+cellHeight-pad-2).coerceAtLeast(nameY+black.textSize),black)
                }
                doc.finishPage(page)
            }
            doc.writeTo(output)
        }finally{doc.close()}
    }
}
