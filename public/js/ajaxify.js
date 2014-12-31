var ajaxify = {};



$(function () {
	ajaxify.bindButtons = function(){
		$("a, button, input[type='button']").each(function(){
			if ($(this).data("confirm") !== undefined ){
				$(this).click(function (event) {
					event.preventDefault();
					
					var settings = {
						animation: 700,	// Animation speed
						buttons: {
							confirm: {
								action: function(response) {
										$(window).unbind("beforeunload");
										$(window).unbind("keydown");
										response.me.dissapear();
										$(event.currentTarget).unbind('click');
										event.currentTarget.click();
									}, // Callback function
								className: null, // Custom class name(s)
								id: 'confirm', // Element ID
								text: 'Ok', // Button text
							},
							cancel:{
								action: function(response) { 
										response.me.dissapear(); 
									}, // Callback function
								className: null, // Custom class name(s)
								id: 'cancel', // Element ID
								text: 'Cancel', // Button text
							}
						},
						input: false, // input dialog
						override: true, // Override browser navigation while Apprise is visible
					};

					Apprise($(this).data("confirm"), settings);
				});
			}
		});
	};

	ajaxify.loadData = function(callback, url) {
		var location = document.location || window.location,
			api_url = (url === '' || url === '/') ? 'home' : url;
		
		var RELATIVE_PATH = 'http://' + document.URL.split("/")[2];
		var url_json = RELATIVE_PATH + '/api/' + api_url;

		$.getJSON(url_json, function(data) {
			if (callback) {
				callback(data);
			}
		});
		ajaxify.go = function(location){
			console.log("Go to: " + location);
		};
	};

	$("form").each(function(index){
		if (!$(this).hasClass("simple")){
			$(this).submit(function(event){
				// Stop form from submitting normally
				event.preventDefault();
				// Get some values from elements on the page:

				var $form = $( this ),
				url = $form.attr( "action" );

				var datatosend = {};

				var inputs = $(this).find("input:not([type=search]),textarea,select");
				$(inputs).each(function(){
					var current_input = $(this);
					if ($(current_input).attr('name')){
						datatosend[$(current_input).attr('name')] = $(current_input).val();	
					}
				});

				var datatables = $(this).find(".form-control-table");
				
				$(datatables).each(function(){
					var arrayData = [];
					
					var lineDataNotFiltered = {};
					var name = $(this).attr('name');
					var lines = $(this).find("tbody tr:not([class=search])");
					var columns = $(this).find("tr:not([class=search]) th");

					datatosend[name] = arrayData;
					$(columns).each(function(columnIndex){
						$(this).each(function(index){
							var dataName = $(this).attr('name');
							if(dataName !== undefined){
								console.log(name+":"+dataName);
								lineDataNotFiltered[columnIndex] = dataName;
							}
						});
					});

					$(lines).each(function(lineIndex, columnsLines){
						var lineData = {};
						var columnsLinesTd = $(columnsLines).find("td");
						$(columnsLinesTd).each(function(columnIndex){
							if (lineDataNotFiltered[columnIndex] !== undefined){
								$(this).each(function(){
									if (!$(this).hasClass("dataTables_empty")){
										if($(this).hasClass("input")){
											lineData[lineDataNotFiltered[columnIndex]] = $(this).find("input").val();
										}else{
											lineData[lineDataNotFiltered[columnIndex]] = $(this).text();
										}
									}
								});
								if ($.inArray(lineData, arrayData) == -1){
									arrayData.push(lineData);
								}
							}
						});


					});
				});

				// Send the data using post
				var posting = $.post(url, {
					data : datatosend
				});
			
				// Put the results in a div
				posting.done(function( data ) {
					if (typeof data.redirect == 'string'){
                    	window.location = data.redirect;
					}else{
						alertify.success(data.create);
                    }
				});
			});
		}
	});
});