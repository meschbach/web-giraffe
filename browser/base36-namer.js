function Base36Namer(){
	this.id = 0;
}

Base36Namer.prototype.next = function(){
	var me = this.id;
	this.id++;
	return me.toString(36);
}

