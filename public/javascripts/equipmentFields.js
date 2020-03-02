function addEquipmentField() {
	$('<div>').attr('class', 'row form-group').attr('id', 'rowEquipment' + equipment_count).appendTo('#equipment');

	$('<div>')
		.attr('class', 'col')
		.attr('id', 'equipmentNameCol' + equipment_count)
		.appendTo('#rowEquipment' + equipment_count);
	$('<label>').attr('for', 'equipmentName' + equipment_count).appendTo('#equipmentNameCol' + equipment_count).text('Equipment ' + equipment_count + ' Name');
	$('<select>')
		.attr('class', 'form-control')
		.attr('id', 'selectEquipment' + equipment_count)
		.attr('name', 'equipmentID' + equipment_count)
		.attr('onChange','selectedEquipment(this)')
		.appendTo('#equipmentNameCol' + equipment_count);
	all_equipment.forEach(function (equip) {
		$('#selectEquipment' + equipment_count).append(new Option(equip.typeName, equip._id));
	});

	$('<div>').attr('class', 'col').attr('id', 'equipmentQuantityCol' + equipment_count).appendTo('#rowEquipment' + equipment_count);
	$('<label>').attr('for', 'quantity' + equipment_count).appendTo('#equipmentQuantityCol' + equipment_count).text('Quantity ' + equipment_count);
	$('<input>')
		.attr('type', 'number')
		.attr('class', 'form-control')
		.attr('name', 'quantity' + equipment_count)
		.attr('min','1')
		.appendTo('#equipmentQuantityCol' + equipment_count);

	if(equipment_count===0){
		$('div[name=quantity'+equipment_count+']').attr('max',all_equipment[0].quantity);
	}

	$('<div>')
		.attr('class', 'col')
		.attr('id', 'removeEquipmentCol' + equipment_count)
		.attr('style', 'flex-grow:0;position:relative;')
		.appendTo('#rowEquipment' + equipment_count);
	$('<a>')
		.attr('class', 'options-btn')
		.attr('href', '#')
		.attr('id', 'removeEquipmentIcon' + equipment_count)
		.attr('style', 'position:absolute;bottom:0;left:0')
		.attr('onclick', '$(this).parent().parent().remove()')
		.appendTo('#removeEquipmentCol' + equipment_count);
	$('<i>').attr('class', 'material-icons md-18').text('delete').appendTo('#removeEquipmentIcon' + equipment_count);

	equipment_count++;
}

function selectedEquipment(event){
	all_equipment.forEach(function(equip){
		if(equip._id === event.value){
			let eq_quantity = equip.quantity;
			$(event).parent().find('div')[1].find('input')[0].attr('max',equip.quantity);
		}
	});
}