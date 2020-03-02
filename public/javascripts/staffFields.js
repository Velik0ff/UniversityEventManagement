function addStaffField() {
	$('<div>').attr('class', 'row form-group').attr('id', 'rowStaff' + staff_count).appendTo('#staff');

	$('<div>')
		.attr('class', 'col')
		.attr('id', 'staffNameCol' + staff_count)
		.appendTo('#rowStaff' + staff_count);
	$('<label>').attr('for', 'staffID' + staff_count).appendTo('#staffEmailCol' + staff_count).text('Staff Member ' + staff_count + ' Email');
	$('<select>')
		.attr('class', 'form-control')
		.attr('id', 'selectStaff' + staff_count)
		.attr('name', 'staffID' + staff_count)
		.appendTo('#staffNameCol' + staff_count);
	all_staff.forEach(function (staff_member) {
		$('#selectStaff' + staff_count).append(new Option(staff_member.fullName, staff_member._id));
	});

	$('<div>').attr('class', 'col').attr('id', 'staffRoleCol' + staff_count).appendTo('#rowStaff' + staff_count);
	$('<label>').attr('for', 'staffRole' + staff_count).appendTo('#staffRoleCol' + staff_count).text('Staff Member ' + staff_count + ' Role');
	$('<input>')
		.attr('type', 'text')
		.attr('class', 'form-control')
		.attr('name', 'staffRole' + staff_count)
		.appendTo('#staffRoleCol' + staff_count);

	$('<div>')
		.attr('class', 'col')
		.attr('id', 'removeStaffCol' + staff_count)
		.attr('style', 'flex-grow:0;position:relative;')
		.appendTo('#rowStaff' + staff_count);
	$('<a>')
		.attr('class', 'options-btn')
		.attr('href', '#')
		.attr('id', 'removeStaffIcon' + staff_count)
		.attr('style', 'position:absolute;bottom:0;left:0')
		.attr('onclick', '$(this).parent().parent().remove()')
		.appendTo('#removeStaffCol' + staff_count);
	$('<i>').attr('class', 'material-icons md-18').text('delete').appendTo('#removeStaffIcon' + staff_count);

	staff_count++;
}