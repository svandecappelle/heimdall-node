Datagrid = {
  load : function(id, options){
    try{
      if (id !== undefined){
        $(id).each(function( index ) {
          var table;
          if (options){
            table = $( this ).DataTable(options);
          }else{
            table = $( this ).DataTable();
          }
          var columns = [];

          $(this).find('tr.search th').each(function () {
              if(!$(this).hasClass("disable")){
                var title = $(this).eq( $(this).index() ).text();
                $(this).html( '<input type="search" placeholder="Search '+title+'" />' );
                var column = $('<input type="search" placeholder="Search '+title+'" />');
                $(this).html(column);
                columns.push(column);
              }
            });

            $.each(columns, function(index, val){
              val.on( 'keyup change', function () {
              table.column( index ).search( val.val() ).draw();
            });
          });
        });
      }else{
        $(".datagrid" ).each(function( index ) {
          var table;
          if (options){
            table = $( this ).DataTable(options);
          }else{
            table = $( this ).DataTable();
          }
          var columns = [];
          $(this).find('tr.search th').each(function () {
            if(!$(this).hasClass("disable")){
              var title = $(this).eq( $(this).index() ).text();
              var column = $('<input type="search" placeholder="Search '+title+'" />');
              $(this).html(column);
              columns.push(column);
            }else{
              columns.push(null);
            }
          });
          // Apply the filter
          $.each(columns, function(index, val){
            if(val){
              val.on( 'keyup change', function () {
                table.column( index ).search( val.val() ).draw();
              });
            }
          });
        });
      }
    }catch(err){
      console.log(err);
    }
  },
  appendData: function(id, data, options){
    var table;
    if (options){
      table = $( id ).DataTable(options);
    }else{
      table = $( id ).DataTable();  
    }
    table.row.add(data).draw();
    ajaxify.bindButtons();
  },
  appendDatas: function(id, datas){
    for (var i=0 ; i < datas.length; i+=1){
      this.appendData(id, datas[i]);
    }
  },
  setData: function(id, datas){
    if (datas.length > 0){
      $(id + '>tbody').html(datas.join(""));
      ajaxify.bindButtons();
    }
  }
};