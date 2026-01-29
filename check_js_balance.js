const fs = require('fs');
const p = 'c:/Users/lenovo/Desktop/Pharmacy/Frontend/src/components/Purchase.jsx';
const s = fs.readFileSync(p,'utf8');
const counts = {'{':0,'}':0,'(':0,')':0,'<':0,'>':0,'`':0,'"':0,"'":0};
for(const ch of s){ if(counts.hasOwnProperty(ch)) counts[ch]++; }
console.log('len', s.length);
console.log(counts);
// show last 200 chars
console.log('TAIL:\n' + s.slice(-200));
// find last occurrences of some tokens
console.log('last {', s.lastIndexOf('{'));
console.log('last }', s.lastIndexOf('}'));
console.log('last (<) ', s.lastIndexOf('(<'));

// find unmatched { positions
const stack = [];
for(let i=0;i<s.length;i++){
	const ch = s[i];
	if(ch==='{') stack.push(i);
	else if(ch==='}'){
		if(stack.length) stack.pop();
		else console.log('extra closing } at', i);
	}
}
if(stack.length) console.log('unmatched { count', stack.length, 'positions (first 10):', stack.slice(0,10));
if(stack.length){
	const pos = stack[0];
	const before = s.slice(Math.max(0,pos-120), pos+120);
	const line = s.slice(0,pos).split('\n').length;
	console.log('first unmatched pos', pos, 'at line', line);
	console.log('context:\n', before);
}
