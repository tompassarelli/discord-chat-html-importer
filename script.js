// Author: 
// 	Discord: @tompas7989
// 	Github: tom.passarelli

// About
//   HTML to JSON convertor script for discord html extracts from discord-chat-exporter

// TODO
//   Emoji Conversions... maybe
//   Test Against Larger Samples for more return types and null exception handling

let dmList = []; //discord message list target for export
let mList = document.querySelectorAll('.chatlog__message-group')

const DiscordMessage = function(){
	this.id = ''
	this.type = 'Default'
	this.timestamp = 'null'
	this.timeStampEdited = 'null'
	this.callEndedTimeStamp = ''
	this.isPinned = 'false'
	this.content = ''
	this.author = {}
	this.attachments = []
	this.embeds = []
	this.reactions = [],
	this.mentions = []
}
const Author = {
	id: '',
	name: '',
	discriminator: '',
	nickname: '',
	color: '', 
	isBot: '',
	avatarUrl: ''
}

const contentTypes = {
	Text: 'Text',
	Attachment: 'Attachment',
	Embed: 'Embed',
	Mentions: 'Mentions',
	Reactions: 'Reactions',
	Unknown: 'Unknown'
};

class DM {
  static get contentTypes() {
    return contentTypes;
  }
}


const typecheckFunctionDictionary = {
	
	checkTextContent: function(node) {
		if(node.querySelector('.preserve-whitespace')) {
			return DM.contentTypes.Text
		}
		return false;
	},
	checkAttachmentContent: function(node) {
		if(node.querySelector('.chatlog__attachment')) {
 			return DM.contentTypes.Attachment
		}
		return false;
	},
	checkEmbedContent: function(node) {
	  if(node.querySelector('.chatlog__embed')) {
			return DM.contentTypes.Embed
		}
		return false;
	},
}

const contentParser = {

	parseText: function(_node) {
		return _node.querySelector('.preserve-whitespace').innerHTML
	},

	parseEmbed: function(_node) {

		//:TODO: not sure if this will ever have content or html bug, 
		//if missing content come back to query type and implement
		if (_node.querySelector('.chatlog__embed-content')) {
		return {
				url: '',
				height: '',
				width: '',
			}
		}

		let node = _node.querySelector('.chatlog__embed').firstElementChild.firstElementChild
		let url = node.getAttribute('src');

		let test = url.split('?').pop()
		let seperator = test.indexOf('&')
		let widthString = test.slice(0,seperator)
		let width = widthString.slice(widthString.indexOf('=')+1)
		let heightString= test.slice(seperator)
		let height = heightString.slice(heightString.indexOf('=')+1)

		return {
				url: url,
				height: height,
				width: width
		}
	},

	parseAttachment: function(_node) {

		let node = _node.querySelector('.chatlog__attachment').firstElementChild.firstElementChild

		let url = node.getAttribute('src');

		let split = node.src.split('/')
		let fileName = split.pop();	
		let id = split.pop();


		let p1 = node.title.indexOf('(')
		let p2 = node.title.indexOf(')')
		let fileSizeMB = node.title.slice(p1+1, p2)
		let endOfByteSizeIndex = fileSizeMB.indexOf('M')-2;
		let fileByteSizeNum = fileSizeMB.slice(0,endOfByteSizeIndex)
		let fileByteSize = parseInt(fileByteSizeNum)*1000000
		
			return {
					url: url,
					id: id,
					fileName: fileName,
					fileByteSize: fileByteSize,
			}
	}
}

function getContentNodeTypes(node) {

	let types = 
		Object.keys(typecheckFunctionDictionary).map(fn => typecheckFunctionDictionary[fn](node)).filter(types => types)

	if (types.length ===0) {
		return DM.contentTypes.Unknown 
	}
	return types
} 

function getContentNodeData(node) {

	let res=[];
	for (let types of getContentNodeTypes(node)) 
	{
		switch(types) 
		{
			case DM.contentTypes.Text:
				res.push({
					contentType: DM.contentTypes.Text,
					content: contentParser.parseText(node)
				})
				break;
			case DM.contentTypes.Attachment:
				res.push({
					contentType: DM.contentTypes.Attachment,
					attachment: contentParser.parseAttachment(node),
				})
				break;
			case DM.contentTypes.Embed:
				res.push({
					contentType: DM.contentTypes.Embed,
					embed: contentParser.parseEmbed(node),
				})
				break;
			default:
				res.push({
					contentType: DM.contentTypes.Unknown,
					content: ''
				})
		}
	}
	return res;
}


mList.forEach(mc => {
	// on next **message container: mc** create temp buffer new entry in mObj
	const dm = new DiscordMessage()
	const author = Object.create(Author)

	// avatar is always same location in tree, grab avatar src (static)
	author.avatarUrl = mc.firstElementChild.firstElementChild.src


	// start traversing chatlog message tree, again static
	// author node first
	author.color = parseColor(mc.lastElementChild.firstElementChild.style.color);
	author.name = mc.lastElementChild.firstElementChild.getAttribute('title')
	author.nickname = parseName(author.name)
	author.id = mc.lastElementChild.firstElementChild.dataset.userId
	author.discriminator = parseDecorator(author.name)
	author.isBot = mc.lastElementChild.firstElementChild.dataset.isBot ? true : false;

	//bind to main object
	dm.author = author;

	// timestamp node second
	dm.timestamp = mc.lastElementChild.children[1].innerHTML

	// we now are presented with 1...n chatlog message nodes
	for (let i=2; i < mc.lastElementChild.children.length; i++) {

		let clm = mc.lastElementChild.children[i]
		const nodeContentDataList = getContentNodeData(clm)

		dm.id = clm.dataset.messageId
		
		for (let nodeContentData of nodeContentDataList) {
			switch (nodeContentData.contentType) {

				case DM.contentTypes.Unknown:
					dm.content = nodeContentData.content ;
					break;
				case DM.contentTypes.Text:
					dm.content = nodeContentData.content;
					break;
				case DM.contentTypes.Attachment:
					dm.content = nodeContentData.attachment.url
					dm.attachments.push(nodeContentData.attachment)
					break;
				case DM.contentTypes.Embed:
					dm.content = nodeContentData.embed.url
					dm.embeds.push(nodeContentData.embed)
					console.log(nodeContentData.embed)
					break;
				default:
			}
		}
	}

	dmList.push(dm)
})

function parseTimestamp(timestamp) {
	//TODO
}

function parseDecorator(name) {
	let startOfDecoratorID = name.indexOf('#')
	return name.slice(startOfDecoratorID)
}

function parseName(name) {
	let startOfDecoratorID = name.indexOf('#')
	return name.slice(0,startOfDecoratorID)
}

function parseColor(color) {
		if (!color) {
			return color;
		}
    var arr=[]; color.replace(/[\d+\.]+/g, function(v) { arr.push(parseFloat(v)); });
    return "#" + arr.slice(0, 3).map(toHex).join("")
}
function toHex(int) {
    var hex = int.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

console.log(JSON.stringify(dmList,null,'\t'))