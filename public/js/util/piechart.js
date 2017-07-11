var Piechart = function(options){
this.options = options;
this.canvas = options.canvas;
this.ctx = this.canvas.getContext("2d");
this.colors = options.colors;

this.drawPieSlice = function (ctx,centerX, centerY, radius, startAngle, endAngle, color ){
ctx.fillStyle = color;
ctx.beginPath();
ctx.moveTo(centerX,centerY);
ctx.arc(centerX, centerY, radius, startAngle, endAngle);
ctx.closePath();
ctx.fill();
};

this.draw = function(){
    var total_value = 0;
    var color_index = 0;
    var val = 0;
    for (var categ in this.options.data){
        val = this.options.data[categ];
        total_value += val;
    }

    var start_angle = 0;
    for (categ in this.options.data){
        val = this.options.data[categ];
        var slice_angle = 2 * Math.PI * val / total_value;

        this.drawPieSlice(
            this.ctx,
            this.canvas.width/2,
            this.canvas.height/2,
            Math.min(this.canvas.width/2,this.canvas.height/2),
            start_angle,
            start_angle+slice_angle,
            this.colors[color_index%this.colors.length]
        );

        start_angle += slice_angle;
        color_index++;
    }

    //drawing a white circle over the chart
    //to create the doughnut chart
    if (this.options.doughnutHoleSize){
        this.drawPieSlice(
            this.ctx,
            this.canvas.width/2,
            this.canvas.height/2,
            this.options.doughnutHoleSize * Math.min(this.canvas.width/2,this.canvas.height/2),
            0,
            2 * Math.PI,
            "#ffffff"
        );
    }

};
};
