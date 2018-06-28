var fs = require("fs");       //require() 加載node_modules
var c  = console;             //console.log 查詢物件裡的東西
var file = process.argv[2];   

var dtable = {
  ""   :0b000,
  "M"  :0b001,
  "D"  :0b010,
  "MD" :0b011,
  "A"  :0b100,
  "AM" :0b101,
  "AD" :0b110,
  "AMD":0b111
}

var jtable = {
  ""   :0b000,
  "JGT":0b001,
  "JEQ":0b010,
  "JGE":0b011,
  "JLT":0b100,
  "JNE":0b101,
  "JLE":0b110,
  "JMP":0b111
}

var ctable = {
  "0"   :0b0101010,
  "1"   :0b0111111,
  "-1"  :0b0111010,
  "D"   :0b0001100,
  "A"   :0b0110000, 
  "M"   :0b1110000,
  "!D"  :0b0001101,
  "!A"  :0b0110001, 
  "!M"  :0b1110001,
  "-D"  :0b0001111,
  "-A"  :0b0110011,
  "-M"  :0b1110011,
  "D+1" :0b0011111,
  "A+1" :0b0110111,
  "M+1" :0b1110111,
  "D-1" :0b0001110,
  "A-1" :0b0110010,
  "M-1" :0b1110010,
  "D+A" :0b0000010,
  "D+M" :0b1000010,
  "D-A" :0b0010011,
  "D-M" :0b1010011,
  "A-D" :0b0000111,
  "M-D" :0b1000111,
  "D&A" :0b0000000,
  "D&M" :0b1000000,
  "D|A" :0b0010101,
  "D|M" :0b1010101
}

var symTable = {
  "R0"  :0,
  "R1"  :1,
  "R2"  :2,
  "R3"  :3,
  "R4"  :4,
  "R5"  :5,
  "R6"  :6,
  "R7"  :7,
  "R8"  :8,
  "R9"  :9,
  "R10" :10,
  "R11" :11,
  "R12" :12,
  "R13" :13,
  "R14" :14,
  "R15" :15,
  "SP"  :0,
  "LCL" :1,
  "ARG" :2,
  "THIS":3, 
  "THAT":4,
  "KBD" :24576,
  "SCREEN":16384
};

var symTop = 16;



assemble(file+'.asm', file+'.hack');

function assemble(asmFile, objFile) {
  var asmText = fs.readFileSync(asmFile, "utf8"); // 讀取檔案到 text 字串中
  var lines   = asmText.split(/\r?\n/); // 將組合語言分割成一行一行
  c.log(JSON.stringify(lines, null, 2));  //JSON.stringify 將JavaScript對象字符串化
  pass(lines, objFile);
} 

function parse(line, i) {                     //分析字串
  line.match(/^([^\/]*)(\/.*)?$/);            //match()搜索字符串指定的值
  line = RegExp.$1.trim();                    //trim()移除空白字元
  if (line.length===0)
    return null;
  if (line.startsWith("@")) {                 //a指令     startsWith()開頭符合字串
    return { type:"A", arg:line.substring(1).trim() }//substring傳回 line 物件中指定之位置的子字串。
  } else if (line.match(/^\(([^\)]+)\)$/)) {
    return { type:"S", symbol:RegExp.$1 }
  } else if (line.match(/^((([AMD]*)=)?([AMD01\+\-\&\|\!]*))(;(\w*))?$/)) {
    return { type:"C", c:RegExp.$4, d:RegExp.$3, j:RegExp.$6 }      //C指令
  } else {
    throw "Error: line "+(i+1);
  }
}
function intToStr(num, size, radix) {
  //  c.log(" num="+num);
    var s = num.toString(radix)+"";           //toString()將數字轉換為字符串
    while (s.length < size) s = "0" + s;
    return s;
  }

function pass(lines, objFile) {                    //將指令轉為機械碼
  c.log("============== pass ================");
  var ws = fs.createWriteStream(objFile);
  ws.once('open', function() {
    var address = 0;
    for (var i=0; i<lines.length; i++) {
      var p = parse(lines[i], i);
      if (p===null || p.type === "S") continue;
      var code = toCode(p);
      c.log("%s:%s %s", intToStr(i+1, 3, 10), intToStr(code, 16, 2),  lines[i]);
      ws.write(intToStr(code, 16, 2)+"\n");
      address++;
    }
    ws.end();
  });
}

function addSymbol(symbol) {
  symTable[symbol] = symTop;
  symTop ++;
}

function toCode(p) {                  //轉換主程式
  var address; 
  if (p.type === "A") {               //a指令
    if (p.arg.match(/^\d+$/)) {           //@2
      address = parseInt(p.arg);        //parseInt()	將輸入的字串轉成整數
    } else {
      address = symTable[p.arg];
      if (typeof address === 'undefined') {
        address = symTop;
        addSymbol(p.arg, address);
        // throw new Error(p.arg + '===undefined')
      }
    }
    return address; 
  } else { // if (p.type === "C")
    var d = dtable[p.d];
    var cx = ctable[p.c];
    var j = jtable[p.j];
    return 0b111<<13|cx<<6|d<<3|j;
  }
}