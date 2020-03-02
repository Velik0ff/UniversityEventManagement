function addVisitorField() {
	$('<div>').attr('class', 'row form-group').attr('id', 'rowVisitor' + visitor_count).appendTo('#visitors');

	$('<div>')
		.attr('class', 'col')
		.attr('id', 'visitorCol' + visitor_count)
		.appendTo('#rowVisitor' + visitor_count);
	$('<label>').attr('for', 'visitorID' + visitor_count).appendTo('#visitorCol' + visitor_count).text('Visitor ' + visitor_count + ' Name');
	$('<select>')
		.attr('class', 'form-control')
		.attr('id', 'selectVisitor' + visitor_count)
		.attr('name', 'visitorID' + visitor_count)
		.appendTo('#visitorCol' + visitor_count);

	all_visitors.forEach(function (visitor) {
		console.log(visitor.leadTeacherName)
		$('#selectVisitor' + visitor_count).append(new Option(visitor.leadTeacherName, visitor._id));
	});

	$('<div>')
		.attr('class', 'col')
		.attr('id', 'removeVisitorCol' + visitor_count)
		.attr('style', 'flex-grow:0;position:relative;')
		.appendTo('#rowVisitor' + visitor_count);
	$('<a>')
		.attr('class', 'options-btn')
		.attr('href', '#')
		.attr('id', 'removeVisitorIcon' + visitor_count)
		.attr('style', 'position:absolute;bottom:0;left:0')
		.attr('onclick', '$(this).parent().parent().remove()')
		.appendTo('#removeVisitorCol' + visitor_count);
	$('<i>').attr('class', 'material-icons md-18').text('delete').appendTo('#removeVisitorIcon' + visitor_count);

	visitor_count++;
}