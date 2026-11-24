const pageTurnCSS=`
:host{all:initial;position:fixed;inset:0;z-index:2147483500;color:#222f29;font:16px/1.5 system-ui,sans-serif;background:#dedfd5;color-scheme:light}
:host([hidden]),[hidden]{display:none!important}*{box-sizing:border-box} button,input,select{font:inherit;color:inherit}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #be7735;outline-offset:3px}
#shell{position:absolute;inset:0;display:flex;flex-direction:column;background:radial-gradient(ellipse at 60% 25%,#edefe7,#d6dbcf)}
header,footer,#controls,.tools,nav{display:flex;align-items:center;gap:10px}header{flex-wrap:wrap;background:#183b31;color:#fffcf2;padding:12px clamp(14px,4vw,68px);box-shadow:0 1px 5px #183b3133}#brand{font:600 25px Georgia,serif;color:#f1e6c6;letter-spacing:-1px;margin-right:18px}nav{gap:3px;flex-wrap:wrap}button{border:1px solid #adb6a7;background:transparent;border-radius:6px;padding:6px 12px;font-size:14px}header button{color:#e2e9db;border-color:transparent}nav button[aria-current=true]{background:#36594c;color:white}#theme{margin-left:auto;border-color:#71877b;padding:6px 9px;display:inline-flex;align-items:center;justify-content:center}#theme svg{display:block;fill:currentColor}#hide{border-color:#71877b}
main{min-height:0;flex:1;overflow:auto;padding:18px clamp(12px,3vw,58px) 16px;display:flex;flex-direction:column}
#controls{margin:auto auto 10px;max-width:1400px;width:100%;justify-content:space-between;flex-wrap:wrap}#status{font-size:14px;color:#35483f}.tools{flex-wrap:wrap}
#spread{width:100%;max-width:1400px;margin:0 auto;min-height:0;flex:1;display:grid;grid-template-columns:1fr 1fr;background:#fffaf0;border:1px solid #7a715f;border-radius:7px 10px 10px 7px;box-shadow:0 3px 0 #c1b6a1,0 5px 0 #ece4d4,0 7px 0 #a09683,0 13px 35px #273a2c36;overflow:hidden}
.leaf{min-width:0;min-height:0;position:relative;display:flex;flex-direction:column;padding:clamp(18px,3vw,50px);padding-bottom:14px}
.leaf:first-child{background:linear-gradient(90deg,#fcf9ee 0%,#fffdf5 88%,#e7deca 100%);border-right:1px solid #beb29c}.leaf:nth-child(2){background:linear-gradient(90deg,#ded3bc,#faf7ec 4%,#fffcf2 13%);border-left:1px solid #e2d7c0}
.flow{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;flex:1}.pagenum{text-align:center;font:14px Georgia,serif;color:#746b58;padding-top:6px}.flow h1,#desk h1{font:500 clamp(24px,2.45vw,42px)/1.13 Georgia,serif;letter-spacing:-.025em;margin:5px 0 14px}.flow small,small{color:#5b685e;font:13px/1.4 system-ui,sans-serif}.flow p{font:clamp(18px,1.45vw,24px)/1.52 Georgia,serif;margin:0 0 .85em}.cue{display:inline;color:#27352d;font:inherit;background:none;border:0;padding:0;border-radius:2px;cursor:pointer;box-decoration-break:clone}.cue:hover{text-decoration:underline}.cue.active{background:#dfedbf}.cue.fresh{animation:ink .15s ease-out}@keyframes ink{from{opacity:.35}to{opacity:1}}@media(prefers-reduced-motion:reduce){.cue.fresh{animation:none}}
figure{margin:0 0 14px}figure img{display:block;max-width:100%;max-height:clamp(85px,16vh,175px);object-fit:contain;border-radius:3px}figcaption{font:13px/1.5 system-ui,sans-serif;color:#566258;margin:4px 0}#spread footer{display:none}footer{justify-content:center;flex-wrap:wrap;padding:12px;color:#35473d}footer button,.tools button{background:#f6f6ec}#position{font-size:14px;min-width:92px;text-align:center}
#desk{width:min(1020px,100%);margin:0 auto;flex:1;padding:clamp(18px,3vw,44px);background:#fffdf5;overflow:auto;border-radius:9px;box-shadow:0 3px 18px #293b2a1c}#desk h1{margin:0}#intro{color:#56665b;margin:8px 0 20px}#query{background:white;border:1px solid #9da99b;padding:8px 12px;border-radius:6px;width:min(460px,100%)}#sort{margin:8px 0;padding:6px;background:white}#list{margin-top:14px}.card{border-top:1px solid #d5d9cb;padding:15px 0}.card h2{font:600 21px/1.3 Georgia,serif;margin:3px 0 6px}.card p{margin:5px 0 8px;font:18px/1.5 Georgia,serif}.card button{margin:3px 6px 0 0}.card a{font-size:14px;color:#26543d}.empty{color:#536056;font-size:16px}#desk label{display:block;font-size:14px;margin-top:10px}a{color:#33583e}#more{margin-top:15px}
@media(max-width:690px){header{padding:8px 10px;gap:3px}#brand{font-size:21px;margin-right:6px}nav{order:2;width:100%;gap:0}nav button{padding:5px 8px}main{padding:8px}#controls{gap:4px}.tools{gap:4px}.tools button,footer button{padding:5px 8px}#spread{display:flex;flex-direction:column;overflow:auto}.leaf{min-height:auto;display:block;padding:20px}.leaf .flow{overflow:visible}.leaf:nth-child(2){border-top:1px solid #c7bca3}.pagenum{padding-bottom:8px}footer{padding:5px}#desk{padding:16px}}

:host([data-theme="dark"]){color:#f2eee4;background:#151714;color-scheme:dark}
:host([data-theme="dark"]) #shell{background:radial-gradient(ellipse at 60% 25%,#222820,#141613)}
:host([data-theme="dark"]) header{background:#0f1c18;color:#f7f1e2;box-shadow:0 1px 5px #0008}
:host([data-theme="dark"]) #brand{color:#ead9a8}
:host([data-theme="dark"]) button{border-color:#5a6358}
:host([data-theme="dark"]) header button{color:#e8eadf}
:host([data-theme="dark"]) nav button[aria-current=true]{background:#2f4a40;color:#fff}
:host([data-theme="dark"]) #theme,:host([data-theme="dark"]) #hide{border-color:#5d7368}
:host([data-theme="dark"]) #status{color:#c5cdc0}
:host([data-theme="dark"]) #spread{background:#1f1f1c;border-color:#4a463c;box-shadow:0 3px 0 #2a2820,0 5px 0 #3a382e,0 7px 0 #171614,0 13px 35px #0008}
:host([data-theme="dark"]) .leaf:first-child{background:linear-gradient(90deg,#242422 0%,#1f1f1c 88%,#191917 100%);border-right-color:#3a3830}
:host([data-theme="dark"]) .leaf:nth-child(2){background:linear-gradient(90deg,#191917,#1f1f1c 4%,#242422 13%);border-left-color:#2e2c28}
:host([data-theme="dark"]) .flow{scrollbar-color:#5a5e54 #1f1f1c}
:host([data-theme="dark"]) .pagenum{color:#a89f8a}
:host([data-theme="dark"]) .flow small, :host([data-theme="dark"]) small{color:#9aa394}
:host([data-theme="dark"]) .flow p,:host([data-theme="dark"]) .cue{color:#efeae0}
:host([data-theme="dark"]) .cue.active{background:#3d4a32;color:#f4f1e6}
:host([data-theme="dark"]) figcaption{color:#9aa394}
:host([data-theme="dark"]) footer{color:#c5cdc0}
:host([data-theme="dark"]) footer button,:host([data-theme="dark"]) .tools button{background:#2a2c26;border-color:#5a5e54;color:#efeae0}
:host([data-theme="dark"]) #desk{background:#1c1d1a;color:#f2eee4;box-shadow:0 3px 18px #0006}
:host([data-theme="dark"]) #intro{color:#b0b8a8}
:host([data-theme="dark"]) #query,:host([data-theme="dark"]) #sort{background:#262822;border-color:#5a6358;color:#f2eee4}
:host([data-theme="dark"]) .card{border-top-color:#3a3c36}
:host([data-theme="dark"]) .card a,:host([data-theme="dark"]) a{color:#9dc4a8}
:host([data-theme="dark"]) .empty{color:#9aa394}
@media(max-width:690px){:host([data-theme="dark"]) .leaf:nth-child(2){border-top-color:#3a3830}}
`;
