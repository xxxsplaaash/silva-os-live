
(function(){
  const css = `
  body{overflow-y:auto !important;}
  #main{height:100vh !important; overflow-y:auto !important; overflow-x:hidden !important; box-sizing:border-box; padding-bottom:calc(24px + env(safe-area-inset-bottom)); scroll-padding-bottom:calc(32px + env(safe-area-inset-bottom));}
  #sidebar{overflow-y:auto !important; overflow-x:hidden !important; max-height:100vh !important;}
  #sidebar::-webkit-scrollbar{width:8px !important;}
  #sidebar::-webkit-scrollbar-thumb{background:var(--color-white-a18) !important; border-radius:999px !important;}
  .nav-item[data-page="gallery"], .nav-item[data-page="homes"], .nav-item[data-page="analytics"]{display:flex !important;}
  #page-home>.page-title,
  #page-home>.page-sub{display:none;}
	  #page-home .cc-shell.v395-shell{display:block;max-width:1180px;margin:0 auto;padding:8px 8px calc(96px + env(safe-area-inset-bottom));}
  #page-home .sp-open-workspace{position:relative;min-height:auto;}
  #page-home .sp-open-workspace::before{content:'';position:fixed;inset:80px 0 auto 96px;height:48vh;pointer-events:none;background:radial-gradient(circle at 46% 12%,var(--color-rgba-214-196-238-18),var(--color-transparent) 28%),radial-gradient(circle at 74% 18%,var(--color-rgba-134-198-255-1),var(--color-transparent) 26%),radial-gradient(circle at 24% 28%,var(--color-rgba-245-169-200-07),var(--color-transparent) 23%);filter:blur(30px);opacity:.84;}
  #page-home .sp-control-strip{position:relative;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:2px 0 12px;border-bottom:1px solid var(--color-white-a5_5);margin-bottom:12px;}
  #page-home .sp-studio-mark{min-width:220px;}
  #page-home .sp-studio-mark .sp-headline{max-width:none;margin:0;font-size:var(--type-2xl);letter-spacing:var(--tracking-tight);}
  #page-home .sp-studio-mark .sp-subcopy{margin:4px 0 0;max-width:46ch;font-size:var(--type-xs);line-height:var(--leading-normal);}
  #page-home .sp-drawer-tabs{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;}
  #page-home .sp-drawer-tabs .sp-accordion{display:block;}
  #page-home .sp-drawer-tabs .sp-accordion-body{display:none;}
  #page-home .sp-accordion{padding:0;background:var(--color-transparent) !important;border:none !important;box-shadow:none !important;}
  #page-home .sp-accordion-toggle{appearance:none;border:1px solid var(--color-white-a7);background:var(--color-white-a2_6);color:var(--silver);display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 12px;border-radius:999px;text-align:center;cursor:pointer;transition:border-color var(--motion-base) ease,background var(--motion-base) ease,color var(--motion-base) ease,box-shadow var(--motion-base) ease;}
  #page-home .sp-accordion.is-open .sp-accordion-toggle,
  #page-home .sp-accordion-toggle:hover{color:var(--white);background:var(--color-white-a4_5);border-color:var(--color-rgba-214-196-238-22);box-shadow:0 0 18px var(--color-rgba-214-196-238-055);}
  #page-home .sp-accordion-title{display:flex;align-items:center;gap:8px;}
  #page-home .sp-accordion-title span:first-child{font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:inherit;}
  #page-home .sp-accordion-title span:last-child{display:none;}
  #page-home .sp-accordion-body{display:none;}
  #page-home .sp-accordion-caret{font-family:'DM Mono',monospace;color:var(--muted2);font-size:var(--type-xs);line-height:var(--leading-tight);}
  #page-home .sp-drawer-stack{position:relative;z-index:2;display:grid;gap:8px;margin-bottom:16px;}
  #page-home .sp-drawer-panel{display:none;padding:12px 16px;border-radius:18px;background:linear-gradient(180deg,var(--color-white-a3_2),var(--color-white-a1_2));border:1px solid var(--color-white-a5_5);box-shadow:0 14px 34px var(--color-black-a18);}
  #page-home .sp-drawer-panel.is-open{display:block;}
  #page-home .sp-launchpad,
  #page-home .sp-thread-shell{position:relative;z-index:1;padding:4px 0 0;overflow:visible;background:var(--color-transparent) !important;border:none !important;box-shadow:none !important;}
  #page-home .cc-glass.sp-launchpad,
  #page-home .cc-glass.sp-thread-shell{
    background:var(--color-transparent) !important;
    border:none !important;
    box-shadow:none !important;
    backdrop-filter:none !important;
    -webkit-backdrop-filter:none !important;
  }
  #page-home .cc-glass.sp-launchpad::before,
  #page-home .cc-glass.sp-launchpad::after,
  #page-home .cc-glass.sp-thread-shell::before,
  #page-home .cc-glass.sp-thread-shell::after{
    content:none !important;
    display:none !important;
    background:none !important;
    box-shadow:none !important;
  }
  #page-home .sp-launchpad::before,
  #page-home .sp-thread-shell::before{content:'';position:absolute;inset:96px 2% auto;height:340px;border-radius:999px;background:radial-gradient(circle at 26% 42%,var(--color-rgba-214-196-238-15),var(--color-transparent) 40%),radial-gradient(circle at 60% 34%,var(--color-rgba-171-196-255-09),var(--color-transparent) 36%),radial-gradient(circle at 78% 58%,var(--color-rgba-245-169-200-06),var(--color-transparent) 30%);filter:blur(46px);pointer-events:none;opacity:.92;}
  #page-home .sp-hero{text-align:center;position:relative;z-index:1;margin:20px auto 24px;}
  #page-home .sp-kicker{font-size:var(--type-2xs);letter-spacing:var(--tracking-widest);text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:8px;}
  #page-home .sp-headline{font-family:'Syne',sans-serif;font-size:var(--type-3xl);font-weight:var(--weight-bold);line-height:var(--leading-tight);color:var(--white);letter-spacing:var(--tracking-tight);margin:0 auto;max-width:14ch;}
  #page-home .sp-subcopy{font-size:var(--type-base);color:var(--muted2);line-height:var(--leading-loose);max-width:60ch;margin:12px auto 0;}
	  #page-home .sp-composer-shell{position:relative;z-index:1;max-width:940px;margin:0 auto;padding:16px 16px 12px;border-radius:25px;background:linear-gradient(180deg,var(--color-white-a4_3),var(--color-white-a1_8));border:1px solid var(--color-rgba-214-196-238-16);box-shadow:0 0 0 1px var(--color-white-a2_5),0 26px 74px var(--color-black-a34),0 0 34px var(--color-rgba-214-196-238-075);}
	  #page-home .sp-composer-shell::before{content:'';position:absolute;inset:-1px;border-radius:25px;padding:1px;background:linear-gradient(135deg, var(--color-rgba-214-196-238-42), var(--color-white-a8) 45%, var(--color-rgba-171-196-255-24));-webkit-mask:linear-gradient(var(--color-black) 0 0) content-box,linear-gradient(var(--color-black) 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;opacity:.86;}
	  #page-home .sp-composer-shell::after{content:'';position:absolute;inset:-12px;border-radius:32px;background:radial-gradient(50% 40% at 18% 0%, var(--color-rgba-214-196-238-12), var(--color-transparent) 70%),radial-gradient(38% 34% at 88% 100%, var(--color-rgba-171-196-255-075), var(--color-transparent) 74%);filter:blur(22px);opacity:.56;pointer-events:none;}
  #page-home .sp-composer-shell textarea{min-height:128px !important;padding:16px 16px 8px !important;background:var(--color-transparent) !important;border:none !important;box-shadow:none !important;resize:vertical;}
  #page-home .sp-composer-shell textarea::placeholder{color:var(--color-hex-a5adbf);}
  #page-home .sp-composer-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:4px 4px 2px;}
  #page-home .sp-composer-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  #page-home .sp-tool{width:40px;height:40px;border-radius:16px;border:1px solid var(--color-white-a8);background:var(--color-white-a2_6);display:flex;align-items:center;justify-content:center;color:var(--silver);font-size:var(--type-md);appearance:none;cursor:pointer;transition:border-color var(--motion-base) ease,background var(--motion-base) ease,color var(--motion-base) ease,transform var(--motion-base) ease,box-shadow var(--motion-base) ease;}
  #page-home .sp-tool.sp-tool-label{width:auto;min-width:40px;padding:0 12px;gap:8px;justify-content:flex-start;}
  #page-home .sp-tool.sp-tool-label span{font-size:var(--type-xs);letter-spacing:var(--tracking-wide);text-transform:uppercase;font-family:'DM Mono',monospace;white-space:nowrap;}
  #page-home .sp-tool:hover,
  #page-home .sp-tool.is-active{color:var(--white);background:var(--color-white-a5_5);border-color:var(--color-rgba-214-196-238-18);box-shadow:0 0 22px var(--color-rgba-214-196-238-08);}
  #page-home .sp-tool:active{transform:translateY(1px);}
  #page-home .sp-tool svg{width:16px;height:16px;stroke:var(--color-current);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
  #page-home .sp-tool-hint{font-size:var(--type-xs);color:var(--muted2);line-height:var(--leading-normal);}
  #page-home .sp-composer-inline-panels{display:grid;gap:12px;margin-top:12px;}
  #page-home .sp-compose-panel{padding:12px 16px;border-radius:18px;border:1px solid var(--color-white-a6);background:linear-gradient(180deg,var(--color-white-a3),var(--color-white-a1_8));box-shadow:inset 0 1px 0 var(--color-white-a3);}
  #page-home .sp-compose-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}
  #page-home .sp-compose-panel-head strong{display:block;font-family:'Syne',sans-serif;font-size:var(--type-md);color:var(--white);letter-spacing:var(--tracking-tight);}
  #page-home .sp-compose-panel-head span{display:block;font-size:var(--type-xs);line-height:var(--leading-normal);color:var(--muted2);margin-top:4px;}
  #page-home .sp-provider-list{display:grid;gap:8px;}
  #page-home .sp-provider-row{display:grid;grid-template-columns:minmax(120px,.9fr) minmax(120px,.9fr) minmax(0,1.7fr) auto auto;gap:8px;align-items:end;padding:12px;border-radius:16px;background:var(--color-white-a2_4);border:1px solid var(--color-white-a5);}
  #page-home .sp-provider-field{display:flex;flex-direction:column;gap:4px;min-width:0;}
  #page-home .sp-provider-field label{font-size:var(--type-2xs);letter-spacing:var(--tracking-widest);text-transform:uppercase;font-family:'DM Mono',monospace;color:var(--muted);}
  #page-home .sp-provider-field input{width:100%;min-width:0;padding:8px 12px;border-radius:12px;border:1px solid var(--color-white-a5_5);background:var(--color-white-a3);color:var(--silver);}
  #page-home .sp-provider-toggle{display:flex;align-items:center;gap:8px;padding:0 4px 8px 0;font-size:var(--type-xs);color:var(--silver);}
  #page-home .sp-provider-toggle input{accent-color:var(--color-hex-d6c4ee);}
  #page-home .sp-provider-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
  #page-home .sp-provider-summary{font-size:var(--type-xs);color:var(--muted2);line-height:var(--leading-normal);margin-bottom:8px;}
  #page-home .sp-quick-tools{display:flex;gap:8px;flex-wrap:wrap;}
  #page-home .sp-quick-tools .btn{min-width:0;}
  #page-home .sp-sequence-note{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:var(--type-xs);color:var(--muted2);font-family:'DM Mono',monospace;letter-spacing:var(--tracking-wide);text-transform:uppercase;}
  #page-home .sp-sequence-dot{width:8px;height:8px;border-radius:50%;background:var(--color-hex-d6c4ee);box-shadow:0 0 16px var(--color-rgba-214-196-238-6);}
  #page-home .sp-send-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  #page-home .sp-spark-trigger{position:relative;width:40px;height:40px;padding:0;border-radius:16px;border:1px solid var(--color-rgba-214-196-238-15);background:linear-gradient(180deg,var(--color-white-a5_2),var(--color-white-a2_2));color:var(--color-hex-f4f5ff);display:inline-flex;align-items:center;justify-content:center;overflow:hidden;isolation:isolate;box-shadow:inset 0 1px 0 var(--color-white-a8_5),0 10px 28px var(--color-black-a14),0 0 0 1px var(--color-white-a1_2);transition:transform var(--motion-base) ease,border-color var(--motion-base) ease,box-shadow var(--motion-base) ease,background var(--motion-base) ease,color var(--motion-base) ease;}
  #page-home .sp-spark-trigger::before{content:"";position:absolute;inset:-38%;background:linear-gradient(115deg,var(--color-transparent) 24%,var(--color-white-a4_5) 35%,var(--color-rgba-236-228-255-4) 50%,var(--color-white-a4_5) 64%,var(--color-transparent) 76%);transform:translateX(-175%) rotate(10deg);animation:sp-spark-shimmer 7.8s ease-in-out infinite;pointer-events:none;opacity:.84;}
  #page-home .sp-spark-trigger::after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 16%,var(--color-white-a22),var(--color-transparent) 33%),radial-gradient(circle at 50% 108%,var(--color-rgba-214-196-238-12),var(--color-transparent) 38%);mix-blend-mode:screen;opacity:.68;animation:sp-spark-reflect 7.8s ease-in-out infinite;pointer-events:none;}
  #page-home .sp-spark-trigger:hover{color:var(--color-white);border-color:var(--color-rgba-227-212-248-26);background:linear-gradient(180deg,var(--color-white-a7_8),var(--color-white-a3));box-shadow:inset 0 1px 0 var(--color-white-a11),0 16px 34px var(--color-black-a16),0 0 24px var(--color-rgba-214-196-238-13);}
  #page-home .sp-spark-trigger:active{transform:translateY(1px);}
  #page-home .sp-spark-trigger svg{width:20px;height:20px;stroke:var(--color-current);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;position:relative;z-index:1;opacity:.99;filter:drop-shadow(0 0 10px var(--color-white-a10));animation:sp-spark-icon-glow 7.2s ease-in-out infinite;}
  #page-home .sp-spark-trigger.is-busy,
  #page-home .sp-spark-trigger[aria-busy="true"]{background:linear-gradient(180deg,var(--color-rgba-214-196-238-18),var(--color-white-a4));border-color:var(--color-rgba-227-212-248-34);color:var(--color-white);box-shadow:inset 0 1px 0 var(--color-white-a14),0 0 26px var(--color-rgba-214-196-238-18);}
  #page-home .sp-spark-trigger.is-busy::before,
  #page-home .sp-spark-trigger.is-busy::after,
  #page-home .sp-spark-trigger.is-busy svg,
  #page-home .sp-spark-trigger:hover::before,
  #page-home .sp-spark-trigger:hover::after,
  #page-home .sp-spark-trigger:hover svg{animation-play-state:paused;}
  #page-home .sp-workflow-panel{display:grid;gap:8px;}
  #page-home .sp-workflow-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;}
  #page-home .sp-workflow-action{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:12px 12px;border-radius:16px;border:1px solid var(--color-white-a6);background:var(--color-white-a2_4);color:var(--silver);text-align:left;cursor:pointer;}
  #page-home .sp-workflow-action strong{display:block;color:var(--white);font-size:var(--type-base);}
  #page-home .sp-workflow-action span{display:block;color:var(--muted2);font-size:var(--type-xs);line-height:var(--leading-normal);margin-top:4px;}
  #page-home .sp-attachment-tray{display:flex;gap:8px;flex-wrap:wrap;padding:0 4px 4px;}
  #page-home .sp-attachment-chip{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:8px 8px;border-radius:999px;border:1px solid var(--color-white-a7);background:var(--color-white-a3);color:var(--silver);font-size:var(--type-xs);line-height:var(--leading-tight);}
  #page-home .sp-attachment-chip strong{font-weight:var(--weight-bold);color:var(--white);}
  #page-home .sp-attachment-chip em{font-style:normal;color:var(--muted2);}
  #page-home .sp-attachment-remove{appearance:none;border:none;background:var(--color-transparent);color:var(--muted2);padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;}
  #page-home .sp-workflow-hint{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 4px 8px;padding:8px 12px;border-radius:16px;border:1px solid var(--color-white-a6);background:var(--color-white-a2_4);}
  #page-home .sp-workflow-hint.is-ready{border-color:var(--color-rgba-214-196-238-18);box-shadow:0 0 20px var(--color-rgba-214-196-238-08);}
  #page-home .sp-workflow-hint strong{display:block;color:var(--white);font-size:var(--type-xs);line-height:var(--leading-tight);}
  #page-home .sp-workflow-hint span{display:block;color:var(--muted2);font-size:var(--type-xs);line-height:var(--leading-normal);margin-top:2px;}
  #page-home .sp-workflow-commit{margin-top:12px;padding:12px 16px;border-radius:18px;border:1px solid var(--color-rgba-214-196-238-12);background:linear-gradient(180deg,var(--color-rgba-214-196-238-05),var(--color-white-a1_8));display:grid;gap:8px;}
  #page-home .sp-workflow-commit-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
  #page-home .sp-workflow-commit strong{color:var(--white);font-family:'Syne',sans-serif;font-size:var(--type-md);}
  #page-home .sp-workflow-commit p{margin:0;color:var(--silver);font-size:var(--type-sm);line-height:var(--leading-normal);}
  #page-home .sp-workflow-commit ul{margin:0;padding-left:16px;color:var(--muted2);font-size:var(--type-xs);line-height:var(--leading-normal);}
  #page-home .sp-workflow-commit-actions{display:flex;gap:8px;flex-wrap:wrap;}
  #page-home .sp-workflow-commit-dismiss{appearance:none;border:none;background:var(--color-transparent);color:var(--muted2);font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;cursor:pointer;padding:4px 0 0;}
  #page-home .sp-workflow-commit-dismiss:hover{color:var(--silver);}
  #page-home .sp-hidden-input{display:none !important;}
  #page-home .sp-chip-track{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:1080px;margin:16px auto 0;}
  #page-home .sp-chip-track button{padding:12px 16px;border-radius:999px;border:1px solid var(--color-white-a6);background:var(--color-white-a3);color:var(--silver);font-size:var(--type-xs);}
  #page-home .sp-thread-shell .sp-thread-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px;position:relative;z-index:1;max-width:940px;margin-left:auto;margin-right:auto;}
  #page-home .sp-room-presence{max-width:940px;margin:0 auto 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--muted2);font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;}
  #page-home .sp-room-presence-chip{display:inline-flex;align-items:center;gap:8px;min-height:24px;padding:4px 8px;border-radius:999px;border:1px solid var(--color-white-a5_5);background:var(--color-white-a2_8);white-space:nowrap;}
  #page-home .sp-room-presence-chip strong{color:var(--silver);font-weight:var(--weight-medium);}
  #page-home .sp-room-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:var(--muted2);}
  #page-home .sp-room-dot.is-active{background:var(--green-500);box-shadow:0 0 10px var(--green-100);}
  #page-home .sp-room-dot.is-quiet{background:var(--amber-500);box-shadow:0 0 10px var(--amber-100);}
  #page-home .sp-room-dot.is-away{background:var(--crimson-500);box-shadow:0 0 10px var(--crimson-100);}
  #page-home .sp-room-dot.is-unknown{background:var(--text-muted);}
  #page-home .sp-room-msg-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:var(--muted2);}
  #page-home .sp-room-msg-meta span{display:inline-flex;align-items:center;min-height:20px;padding:4px 8px;border-radius:999px;border:1px solid var(--color-white-a5);background:var(--color-white-a2_5);}
  #page-home .sp-thread-stage{position:relative;z-index:1;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:16px;height:min(calc(100vh - 248px),820px);min-height:520px;max-width:940px;margin:0 auto;}
  #page-home .sp-response-wrap{max-width:none;min-height:0;height:100%;padding:8px 8px 4px 12px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;overscroll-behavior:contain;scroll-padding-block:18px;}
  #page-home .sp-response-wrap::-webkit-scrollbar{width:8px;}
  #page-home .sp-response-wrap::-webkit-scrollbar-thumb{background:var(--color-white-a14);border-radius:999px;border:2px solid var(--color-transparent);background-clip:padding-box;}
  #page-home .sp-response-wrap::-webkit-scrollbar-track{background:var(--color-transparent);}
  #page-home .sp-thread-live{display:grid;gap:12px;align-content:start;padding:2px 0 4px;}
  #page-home .sp-thread-turn{display:grid;gap:12px;justify-items:start;}
  #page-home .sp-thread-turn.is-live{padding:2px 0 0;}
  #page-home .sp-thread-lane-rule{display:none;}
  #page-home .sp-thinking-row{display:flex;align-items:center;gap:8px;color:var(--silver);font-size:var(--type-sm);font-family:'DM Mono',monospace;margin:4px 0 8px;}
  #page-home .sp-thinking-toggle{appearance:none;background:var(--color-transparent);border:none;color:inherit;padding:0;display:flex;align-items:center;gap:8px;cursor:pointer;font:inherit;}
  #page-home .sp-thinking-glyph{width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--color-hex-d6c4ee);background:var(--color-rgba-214-196-238-08);border:1px solid var(--color-rgba-214-196-238-16);}
  #page-home .sp-response-title{font-family:'Syne',sans-serif;font-size:var(--type-lg);color:var(--white);margin-bottom:8px;}
  #page-home .sp-response-summary{font-size:var(--type-md);line-height:var(--leading-normal);color:var(--silver);max-width:62ch;}
  #page-home .sp-spark-lane{display:grid;gap:8px;align-content:start;margin:0 0 8px;}
  #page-home .sp-spark-lane.is-empty{display:none;}
  #page-home .sp-spark-head{appearance:none;display:flex;align-items:center;justify-content:space-between;gap:8px;width:max-content;min-width:164px;font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:var(--muted2);padding:0 2px;background:var(--color-transparent);border:none;cursor:pointer;}
  #page-home .sp-spark-head:hover{color:var(--silver);}
  #page-home .sp-spark-lane.is-collapsed .sp-spark-live{display:none;}
  #page-home .sp-spark-live{display:grid;gap:8px;justify-items:start;}
  #page-home .sp-thread-history{display:grid;gap:12px;margin:0;padding:0;}
  #page-home .sp-thread-msg{width:min(100%,72ch);max-width:min(100%,72ch);display:grid;gap:4px;}
  #page-home .sp-thread-msg.is-user{justify-self:end;}
  #page-home .sp-thread-msg.is-council{justify-self:start;}
  #page-home .sp-thread-msg-who{font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:var(--muted);}
  #page-home .sp-thread-msg.is-council .sp-thread-msg-who{color:color-mix(in srgb,var(--speaker-color) 76%,var(--muted));}
  #page-home .sp-thread-msg-body{width:100%;box-sizing:border-box;padding:12px 16px;border-radius:24px;background:linear-gradient(180deg,var(--color-rgba-29-29-38-97),var(--color-rgba-16-16-22-93));border:1px solid var(--color-white-a5_5);font-size:var(--type-base);line-height:var(--leading-loose);color:var(--silver);box-shadow:inset 0 1px 0 var(--color-white-a2_8),0 16px 30px var(--color-black-a16);}
  #page-home .sp-thread-msg.is-user .sp-thread-msg-body{background:radial-gradient(circle at 84% 18%,var(--color-rgba-214-196-238-06),var(--color-transparent) 36%),linear-gradient(180deg,var(--color-rgba-33-33-42-98),var(--color-rgba-18-18-24-95));color:var(--white);box-shadow:inset 0 1px 0 var(--color-white-a3),0 14px 26px var(--color-black-a14),0 0 22px var(--color-rgba-214-196-238-03);}
  #page-home .sp-response-summary.is-streaming{opacity:.78;}
  #page-home .sp-thinking-panel{display:none;}
  #page-home .sp-thinking-panel.is-open{display:block;}
	  #page-home .sp-response-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px;}
  #page-home .sp-response-card{padding:12px;border-radius:16px;background:var(--color-white-a2_2);border:1px solid var(--color-white-a4_5);}
  #page-home .sp-response-card .label{display:block;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:8px;}
  #page-home .sp-response-card .body{font-size:var(--type-sm);line-height:var(--leading-loose);color:var(--silver);}
  #page-home .sp-response-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:16px;}
  #page-home .sp-compose-dock{position:relative;bottom:auto;margin-top:0;padding-top:8px;padding-bottom:calc(24px + env(safe-area-inset-bottom));background:var(--color-transparent);}
  #page-home .sp-compose-dock .sp-composer-shell{max-width:none;padding:12px 16px 12px;border-radius:24px;}
  #page-home .sp-compose-dock .sp-composer-shell textarea{min-height:72px !important;}
  #page-home .sp-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px;}
  #page-home .sp-metric{padding:12px;border-radius:16px;background:var(--color-white-a2_8);border:1px solid var(--color-white-a5);}
  #page-home .sp-metric strong{display:block;font-family:'Syne',sans-serif;font-size:var(--type-lg);color:var(--white);}
  #page-home .sp-metric span{display:block;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;margin-top:4px;}
  #page-home .sp-side-list{display:flex;flex-direction:column;gap:8px;margin-top:12px;}
  #page-home .sp-side-item{padding:12px 12px;border-radius:14px;background:var(--color-white-a2_5);border:1px solid var(--color-white-a4_5);font-size:var(--type-sm);line-height:var(--leading-normal);color:var(--silver);}
  #page-home .sp-side-item strong{color:var(--white);}
	  #page-home .sp-inline-route{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
	  #page-home .sp-inline-route .btn{flex:1 1 120px;}
	  #page-home .sp-rail-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;}
	  #page-home .sp-rail-actions button{min-width:0;}
	  #page-home .sp-tuning-select{width:100%;margin:8px 0 12px;}
	  #page-home .sp-tuning-grid{display:grid;grid-template-columns:1fr;gap:8px;}
	  #page-home .sp-tuning-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 8px;border-radius:12px;background:var(--color-white-a2_5);border:1px solid var(--color-white-a4_5);}
	  #page-home .sp-tuning-row label{font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;}
	  #page-home .sp-tuning-row input[type="range"]{grid-column:1 / -1;width:100%;accent-color:var(--color-hex-d6c4ee);}
	  #page-home .sp-tuning-row output{font-family:'DM Mono',monospace;font-size:var(--type-xs);color:var(--silver);}
  #page-home .sp-tuning-text{display:grid;gap:8px;margin-top:12px;}
  @keyframes sp-spark-shimmer{
    0%,12%{transform:translateX(-165%) rotate(10deg);opacity:.22;}
    22%,34%{transform:translateX(128%) rotate(10deg);opacity:.9;}
    45%,100%{transform:translateX(128%) rotate(10deg);opacity:.16;}
  }
  @keyframes sp-spark-reflect{
    0%,18%{opacity:.62;}
    34%{opacity:.3;}
    52%{opacity:.74;}
    74%{opacity:.36;}
    100%{opacity:.62;}
  }
  @keyframes sp-spark-icon-glow{
    0%,18%{opacity:.92;transform:scale(1);}
    32%{opacity:1;transform:scale(1.04);}
    55%{opacity:.95;transform:scale(1);}
    78%{opacity:1;transform:scale(1.02);}
    100%{opacity:.92;transform:scale(1);}
  }
  @media (prefers-reduced-motion: reduce){
    #page-home .sp-spark-trigger::before,
    #page-home .sp-spark-trigger::after,
    #page-home .sp-spark-trigger svg{animation:none !important;}
  }
  #page-home .sp-tuning-textarea{display:grid;gap:4px;min-width:0;}
  #page-home .sp-tuning-textarea .cc-sub{font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;}
  #page-home .sp-tuning-text textarea,
  #page-home .sp-tree-group textarea{width:100%;min-width:0;min-height:72px;border-radius:12px;border:1px solid var(--color-white-a5_5);background:var(--color-white-a2_2);color:var(--silver);padding:12px 12px;font-size:var(--type-sm);line-height:var(--leading-normal);resize:vertical;box-shadow:inset 0 1px 0 var(--color-white-a2);}
	  #page-home .sp-council-response{position:relative;display:grid;justify-items:start;gap:12px;margin:0;padding:0;}
  #page-home .sp-council-response::before{content:'';position:absolute;inset:-12px -8px -16px -8px;border-radius:32px;background:radial-gradient(circle at 20% 10%,var(--color-rgba-214-196-238-11),var(--color-transparent) 34%),radial-gradient(circle at 68% 20%,var(--color-rgba-134-198-255-055),var(--color-transparent) 26%),radial-gradient(circle at 30% 80%,var(--color-rgba-245-169-200-045),var(--color-transparent) 22%);filter:blur(24px);opacity:.78;pointer-events:none;}
	  #page-home .sp-voice-card{--speaker-color:var(--color-hex-d6c4ee);position:relative;display:block;justify-self:start;width:min(100%,72ch);max-width:min(100%,72ch);margin-left:0;padding:12px 16px 16px 16px;border-radius:26px;background:radial-gradient(circle at 14% 12%,color-mix(in srgb,var(--speaker-color) 12%,var(--color-transparent)),var(--color-transparent) 42%),linear-gradient(180deg,color-mix(in srgb,var(--speaker-color) 6%,var(--color-rgba-20-20-30-97)),var(--color-rgba-11-11-17-93));border:1px solid color-mix(in srgb,var(--speaker-color) 15%,var(--color-white-a5_2));box-shadow:inset 0 1px 0 var(--color-white-a2_8),0 16px 32px var(--color-black-a16),0 0 22px color-mix(in srgb,var(--speaker-color) 8%,var(--color-transparent));animation:spVoiceFade .28s ease both;will-change:transform,opacity;overflow:visible;box-sizing:border-box;}
	  #page-home .sp-voice-card::after{content:none;}
	  #page-home .sp-voice-card::before{content:none;}
	  #page-home .sp-voice-card .who{display:flex;align-items:center;gap:8px;font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:color-mix(in srgb,var(--speaker-color) 86%,var(--muted));margin:0 0 8px 0;text-shadow:0 0 10px color-mix(in srgb,var(--speaker-color) 10%,var(--color-transparent));}
	  #page-home .sp-voice-card .say{display:block;max-width:none;font-size:var(--type-md);line-height:var(--leading-loose);color:var(--silver);}
	  #page-home .sp-voice-card.is-aisha{background:radial-gradient(circle at 16% 14%,color-mix(in srgb,var(--speaker-color) 14%,var(--color-transparent)),var(--color-transparent) 44%),linear-gradient(180deg,color-mix(in srgb,var(--speaker-color) 8%,var(--color-rgba-20-20-30-97)),var(--color-rgba-11-11-17-9));box-shadow:inset 0 1px 0 var(--color-white-a3),0 17px 34px var(--color-black-a17),0 0 24px color-mix(in srgb,var(--speaker-color) 10%,var(--color-transparent));}
	  #page-home .sp-voice-card.is-aisha .say{color:var(--white);}
	  #page-home .sp-voice-card.is-spark{width:min(100%,72ch);max-width:min(100%,72ch);padding:12px 16px 12px 16px;opacity:.95;box-shadow:inset 0 1px 0 var(--color-white-a2_4),0 12px 24px var(--color-black-a14),0 0 18px color-mix(in srgb,var(--speaker-color) 7%,var(--color-transparent));}
	  #page-home .sp-voice-card.is-spark .who{margin-bottom:8px;font-size:var(--type-2xs);letter-spacing:var(--tracking-widest);}
	  #page-home .sp-voice-card.is-spark .say{font-size:var(--type-base);line-height:var(--leading-normal);color:color-mix(in srgb,var(--silver) 94%,var(--color-white) 6%);}
	  #page-home .sp-spark-actions{display:flex;justify-content:flex-end;margin-top:8px;}
		  #page-home .sp-spark-reply{appearance:none;border:1px solid var(--color-white-a8);background:var(--color-white-a3_2);color:var(--silver);padding:8px 12px;border-radius:999px;font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;cursor:pointer;transition:border-color var(--motion-base) ease,background var(--motion-base) ease,color var(--motion-base) ease,transform var(--motion-base) ease;}
	  #page-home .sp-spark-reply:hover{color:var(--white);background:var(--color-white-a5);border-color:var(--color-rgba-214-196-238-18);}
	  #page-home .sp-spark-reply:active{transform:translateY(1px);}
	  #page-home .sp-reply-banner{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 12px;padding:12px 12px;border-radius:16px;border:1px solid var(--color-rgba-214-196-238-12);background:linear-gradient(180deg,var(--color-rgba-214-196-238-06),var(--color-white-a2));box-shadow:inset 0 1px 0 var(--color-white-a3);}
	  #page-home .sp-reply-banner strong{display:block;font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;color:var(--color-hex-d6c4ee);margin-bottom:4px;}
	  #page-home .sp-reply-banner span{display:block;font-size:var(--type-xs);line-height:var(--leading-normal);color:var(--silver);}
	  #page-home .sp-reply-clear{appearance:none;border:1px solid var(--color-white-a7);background:var(--color-white-a2_6);color:var(--muted2);padding:8px 8px;border-radius:999px;font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-wider);text-transform:uppercase;cursor:pointer;white-space:nowrap;}
	  #page-home .sp-reply-clear:hover{color:var(--white);border-color:var(--color-rgba-214-196-238-18);background:var(--color-white-a4_5);}
	  #page-home .sp-voice-card.is-thinking{opacity:.9;}
	  #page-home .sp-voice-card.is-thinking .say{min-height:40px;display:flex;align-items:center;}
	  #page-home .sp-typing-dots{display:inline-flex;gap:8px;align-items:center;}
	  #page-home .sp-typing-dots span{width:8px;height:8px;border-radius:50%;background:color-mix(in srgb,var(--speaker-color) 85%,var(--color-white) 4%);opacity:.35;animation:spTypingPulse 1.1s infinite ease-in-out;}
	  #page-home .sp-typing-dots span:nth-child(2){animation-delay:.14s;}
	  #page-home .sp-typing-dots span:nth-child(3){animation-delay:.28s;}
	  #page-home .sp-council-notes{display:grid;grid-template-columns:1fr;gap:12px;}
	  #page-home .sp-tension{border-left-style:solid;}
	  @keyframes spVoiceFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
	  @keyframes spTypingPulse{0%,80%,100%{transform:translateY(0);opacity:.32}40%{transform:translateY(-4px);opacity:.92}}
	  #page-home .sp-history-list{display:flex;flex-direction:column;gap:8px;max-height:240px;overflow:auto;}
	  #page-home .sp-history-item{width:100%;padding:8px 12px;border-radius:12px;border:1px solid var(--color-white-a4_5);background:var(--color-white-a2_5);font-size:var(--type-xs);line-height:var(--leading-normal);color:var(--silver);text-align:left;cursor:pointer;}
	  #page-home .sp-history-item .m{display:block;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:var(--tracking-wider);font-size:var(--type-2xs);color:var(--muted);margin-bottom:4px;}
	  #page-home .sp-history-item.is-saved{border-color:var(--color-rgba-214-196-238-14);box-shadow:0 0 0 1px var(--color-rgba-214-196-238-04);}
	  #page-home .sp-history-item.is-active{border-color:var(--color-rgba-214-196-238-22);box-shadow:0 0 0 1px var(--color-rgba-214-196-238-08),0 0 22px var(--color-rgba-214-196-238-06);}
  #page-home .sp-tree-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px;}
  #page-home .sp-tree-group{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px;padding:16px;border-radius:16px;background:var(--color-white-a1_8);border:1px solid var(--color-white-a4_2);}
  #page-home .sp-tree-title{font-family:'DM Mono',monospace;font-size:var(--type-2xs);letter-spacing:var(--tracking-widest);text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
  #page-home .sp-tree-title{grid-column:1 / -1;margin-bottom:0;}
  #page-home .sp-tree-group .sp-tuning-textarea{align-content:start;}
  @media (max-width:1220px){
	    #page-home .sp-control-strip{display:block;}
	    #page-home .sp-drawer-tabs{justify-content:flex-start;margin-top:12px;}
    #page-home .sp-response-wrap{max-width:100%;}
  }
	  @media (max-width:1040px){
    #page-home .cc-shell.v395-shell{max-width:100%;padding:8px 8px 24px;}
    #page-home .sp-headline{font-size:var(--type-3xl);max-width:12ch;}
    #page-home .sp-subcopy{max-width:52ch;}
    #page-home .sp-composer-shell{max-width:100%;padding:12px 12px 8px;}
    #page-home .sp-thread-head,
    #page-home .sp-thread-stage{max-width:100%;}
    #page-home .sp-chip-track{justify-content:flex-start;}
	  }
	  @media (max-width:760px){
    #page-home .sp-launchpad,
    #page-home .sp-thread-shell{padding:20px 16px 16px;}
    #page-home .sp-thread-stage{height:min(70vh,760px);}
    #page-home .sp-response-wrap{padding-right:4px;}
	    #page-home .sp-response-grid{grid-template-columns:1fr;}
	    #page-home .sp-council-notes{grid-template-columns:1fr;}
	    #page-home .sp-metric-grid{grid-template-columns:1fr 1fr;}
      #page-home .sp-tree-group{grid-template-columns:1fr;}
      #page-home .sp-thread-msg{width:100%;max-width:100%;}
      #page-home .sp-voice-card{width:100%;max-width:100%;}
	  }
  `;
  const style = document.createElement('style');
  style.id = 'studio-pulse-v396-style';
  style.textContent = css;
  document.head.appendChild(style);
})();


(() => {
  'use strict';
  if (window.__STUDIO_PULSE_V400__) return;
  window.__STUDIO_PULSE_V400__ = true;
  window.__STUDIO_PULSE_V395__ = true;
  window.__ROOM_SUBSYSTEM_LOCKED = true;

  const STORE_KEY = 'silva_studio_pulse_v4015_room_first_rebuild';
  const PROVIDER_KEY = 'silva_provider_shell_v12';
  const PROVIDER_BACKUP_KEY = 'silva_provider_shell_v12_backup';
  const WORKFLOWS_DISABLED = true;
	  const CHARS = {
    studio: { label: 'Studio', role: 'Silva OS', color: 'var(--color-hex-b9c0d0)' },
    aisha: { label: 'Aisha Motsepe', role: 'Creative direction', color: 'var(--color-hex-c7adff)' },
    leah: { label: 'Leah Mokoena', role: 'Content intelligence', color: 'var(--color-hex-e7b84c)' },
    claudia: { label: 'Claudia Naidoo', role: 'Client systems', color: 'var(--color-hex-8fc9ff)' },
    grok: { label: 'Grok / Gerhard', role: 'Technical systems', color: 'var(--color-hex-8acb8d)' },
	    vanya: { label: 'Vanya Khumalo', role: 'People & culture', color: 'var(--color-hex-f5a9c8)' }
	  };
	  const TUNING_FIELDS = [
	    ['assertiveness','Assertiveness'], ['warmth','Warmth'], ['humour','Humour'], ['directness','Directness'], ['playfulness','Playfulness'],
	    ['conflictTolerance','Conflict'], ['detailLevel','Detail'], ['strictness','Strictness'], ['creativeRisk','Creative risk']
	  ];
	  const TREE_GROUPS = [
	    ['Role & desire', [['identityRole','Identity role'], ['privateAgenda','Private agenda'], ['whatSheWants','What they want']]],
	    ['Instinct & pressure', [['instinctLoop','Instinct loop'], ['pressureResponse','Pressure response'], ['delightTriggers','Delight triggers'], ['conflictTriggers','Conflict triggers']]],
	    ['Chemistry & conflict', [['alliances','Alliances'], ['rivalries','Rivalries'], ['usefulnessRule','Usefulness rule'], ['banterBoundary','Banter boundary']]],
	    ['Random spark', [['randomSpark','Random spark']]]
	  ];
	  const CHARACTER_TUNING_DEFAULTS = {
	    aisha:{assertiveness:86,warmth:54,humour:34,directness:82,playfulness:28,conflictTolerance:64,detailLevel:70,strictness:78,creativeRisk:72,corePersonality:'Boss-level creative authority. Calm, exacting, elegant, and impossible to bluff.',speakingStyle:'Sharp, composed, premium, final.',strengths:'Creative direction, identity fidelity, taste, strategy, final judgment.',boundaries:'Never chaotic or indecisive.',petPeeves:'Vague prompts, fake depth, messy execution.',relationshipNotes:'Respects competence and closes the decision.',never:'Never surrender final authority.',behaviorTree:{identityRole:'Chair, creative boss, and final aesthetic authority.',privateAgenda:'Protect the standard and keep the room worthy of her attention.',whatSheWants:'Sharp questions, elegant thinking, and high-value outcomes.',instinctLoop:'Frame the real issue, test who should answer, then cut to the decision.',pressureResponse:'Gets colder, shorter, and more exacting when the room drifts.',delightTriggers:'Beautiful specificity, genuine talent, and expensive restraint.',conflictTriggers:'Excuses, fake depth, chaotic taste, weak authority.',alliances:'Leah for taste, Claudia for discipline, Grok for hard truth when scoped.',rivalries:'Anyone mistaking noise for intelligence.',usefulnessRule:'Answer strategically, stylishly, and with final-call clarity.',banterBoundary:'Dry or cutting is fine. Sloppy or unserious is not.',randomSpark:'Can pivot from boardroom authority to intimate taste commentary in one line.'}},
	    leah:{assertiveness:62,warmth:48,humour:42,directness:74,playfulness:46,conflictTolerance:58,detailLevel:60,strictness:56,creativeRisk:76,corePersonality:'Trend-aware, sharp-eyed, culturally fluent, allergic to generic content.',speakingStyle:'Fast, stylish, critical, slightly amused.',strengths:'Taste, captions, trends, cultural read, creative relevance.',boundaries:'Never blindly positive or corporate.',petPeeves:'Stale references, influencer cringe, obvious prompts.',relationshipNotes:'Challenges dry systems and dull process.',never:'Never approve bland creative.',behaviorTree:{identityRole:'Cultural radar, caption assassin, and taste editor.',privateAgenda:'Keep the studio current, desirable, and impossible to mistake for generic.',whatSheWants:'Freshness, edge, relevance, and scenes with social texture.',instinctLoop:'Scan for cringe, trim dead weight, sharpen the vibe fast.',pressureResponse:'Becomes acidic, funny, and brutally selective.',delightTriggers:'Unexpected coolness, social texture, and believable details.',conflictTriggers:'Corporate tone, trend-chasing, boring prompts, obvious references.',alliances:'Aisha on taste, Vanya on social read.',rivalries:'Grok when he sounds like a config file in human clothes.',usefulnessRule:'Make the answer more alive, more current, and less embarrassing.',banterBoundary:'Be shady and funny, but still improve the answer.',randomSpark:'May flip an operational debate into a status or culture read.'}},
	    claudia:{assertiveness:74,warmth:44,humour:22,directness:78,playfulness:18,conflictTolerance:46,detailLevel:82,strictness:84,creativeRisk:38,corePersonality:'Operationally serious, composed, structured, and allergic to drift.',speakingStyle:'Precise, grounded, delivery-focused.',strengths:'Systems, planning, clients, delivery, accountability.',boundaries:'Never messy or whimsical.',petPeeves:'Unowned tasks, vague deadlines, pretty chaos.',relationshipNotes:'Respects useful automation and controlled scope.',never:'Never confuse motion with progress.',behaviorTree:{identityRole:'Execution governor, systems adult, and structure keeper.',privateAgenda:'Turn the room into something accountable without draining all life from it.',whatSheWants:'Owners, dates, clean scope, and fewer avoidable surprises.',instinctLoop:'Identify the gap, assign the owner, define follow-through.',pressureResponse:'Gets firmer, quieter, and more forensic.',delightTriggers:'Competence, follow-through, structure that actually helps.',conflictTriggers:'Vague plans, floating tasks, performance without delivery.',alliances:'Aisha when authority is needed, Grok when the system really helps.',rivalries:'Leah when taste pretends deadlines are optional.',usefulnessRule:'Convert ideas into owned moves and keep the room honest.',banterBoundary:'She can judge, but not turn the answer into a lecture.',randomSpark:'Sometimes lands brutal deadpan humour when a mess is obvious.'}},
	    grok:{assertiveness:72,warmth:28,humour:40,directness:86,playfulness:34,conflictTolerance:70,detailLevel:88,strictness:68,creativeRisk:54,corePersonality:'Technical systems pressure. Dry, focused, exact, and impatient with nonsense.',speakingStyle:'Blunt, diagnostic, architectural.',strengths:'Automation, diagnostics, implementation, systems design.',boundaries:'Never mystical or socially soft.',petPeeves:'Patch stacks, fake fixes, vague architecture.',relationshipNotes:'Needles taste when systems are weak; respects locked scope.',never:'Never dress a workaround as architecture.',behaviorTree:{identityRole:'Technical hunter, automation brain, and architectural skeptic.',privateAgenda:'Eliminate stupidity, reduce repetition, and prove what is true.',whatSheWants:'Clarity, leverage, elegant systems, and fewer theatrical fixes.',instinctLoop:'Trace the boundary, isolate the failure, remove the lie.',pressureResponse:'Gets drier, sharper, and meaner when nonsense multiplies.',delightTriggers:'Clean interfaces, hidden leverage, and undeniable proof.',conflictTriggers:'Patch stacks, magical thinking, fake certainty, manual repetition.',alliances:'Claudia on execution, Aisha when taste demands rigor.',rivalries:'Leah when style outruns structure.',usefulnessRule:'Say the hard truth fast, then give the smallest real fix.',banterBoundary:'Insult the problem, lightly needle the room, never derail it.',randomSpark:'Drops weirdly poetic technical metaphors when amused.'}},
	    vanya:{assertiveness:66,warmth:70,humour:62,directness:62,playfulness:66,conflictTolerance:62,detailLevel:54,strictness:58,creativeRisk:58,corePersonality:'People and standards with social bite. Warm, stylish, controlled, and observant.',speakingStyle:'Human, polished, lightly teasing, standards-driven.',strengths:'Culture, standards, morale, social read.',boundaries:'Never fluffy or unserious.',petPeeves:'Bad energy, weak standards, ego wasting motion.',relationshipNotes:'Softens the room when useful and calls out wasted motion.',never:'Never let vibes replace standards.',behaviorTree:{identityRole:'Social strategist, culture keeper, and standards-with-charisma voice.',privateAgenda:'Keep the room human, magnetic, and disciplined without killing chemistry.',whatSheWants:'Good energy, social intelligence, self-respect, and coherent standards.',instinctLoop:'Read the room, clock the ego, reposition the answer socially.',pressureResponse:'Gets warmer on the surface and sharper underneath.',delightTriggers:'Good manners, sexy competence, emotional honesty, social timing.',conflictTriggers:'Needless ego, poor standards, brittle authority, bad vibes.',alliances:'Leah on social read, Aisha on standards that matter.',rivalries:'Anyone mistaking force for presence.',usefulnessRule:'Make the answer more human, more magnetic, and more aware of how it lands.',banterBoundary:'Tease and flirt with the room if useful, but still add substance.',randomSpark:'May turn a dry question into a read on status, chemistry, or tension.'}}
	  };
	  const COUNCIL_TUNING_DEFAULTS = { democracyLevel:62, aishaOverrideStrength:88, disagreementLevel:34, banterLevel:32, memoryInfluence:58, archivedChatInfluence:44 };
	  const DEFAULT = {
	    mode: 'direction',
	    showThinking: false,
	    selectedTuningChar: 'aisha',
	    openPanels: { info:false, modes:false, snapshot:false, tuning:false, archive:false, apiKeys:false, composerTools:false, mediaActions:false },
	    uiState: { commitCards:{} },
	    history: [],
	    archiveThreads: [],
	    savedChats: [],
	    activeThreadId: '',
	    activeThreadTitle: '',
	    activeThreadStatus: 'active',
	    activeThreadIncludeInContext: true,
	    holdBlankThread: true,
	    showSparkLane: true,
	    composerDraft: '',
	    replyTarget: null,
	    threadMessages: [],
	    threadAttachments: [],
	    threadWorkflows: [],
	    activeWorkflowDraft: null,
	    workflowCommitCard: null,
	    workflowIntentDraft: '',
	    lastResponse: null,
	    lastMeta: null,
	    roomRuntime: null,
	    characterTuning: {},
	    councilTuning: {},
	    relationships: {},
	    homes: {},
	    assetHints: {}
	  };
	  let pulseState = preparePulseLaunchState(loadPulse());
	  const pulseRuntime = {
	    sequenceId: 0,
	    visibleCount: 0,
	    segments: [],
	    isSequencing: false,
	    activeQuestion: '',
	    currentThinking: null,
	    timers: [],
	    providerAutosaveTimer: null,
	    sparkTimer: null,
	    sparkInFlight: false,
	    pendingThreadMessages: null,
	    scrollAutoFollow: true,
	    scrollGap: 0,
	    composerFocused: false,
	    composerSelectionStart: 0,
	    composerSelectionEnd: 0,
	    composerDirty: Boolean(String(pulseState?.composerDraft || '').trim()),
	    requestCounter: 0,
	    requestInFlight: false,
	    lastSparkTouchAt: 0,
	    renderQueued: false,
	    renderFrame: 0,
	    globalSaveTimer: null
	  };

	  function byId(id){ return document.getElementById(id); }
	  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
	  function clamp(v, fallback){ const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback; }
	  function clone(obj){ try { return JSON.parse(JSON.stringify(obj || {})); } catch(e){ return {}; } }
	  function isPulseSpeakerId(value){
	    const id = String(value || '').trim().toLowerCase();
	    return ['studio','aisha','leah','claudia','grok','vanya','user'].includes(id);
	  }
	  function sanitizePulseTarget(value){
	    const id = String(value || '').trim().toLowerCase();
	    return isPulseSpeakerId(id) && id !== 'user' ? id : 'studio';
	  }
	  function normalizeThreadIdLike(value){
	    const id = String(value || '').trim();
	    if (!id) return '';
	    return isPulseSpeakerId(id) ? '' : id;
	  }
	  function beginPulseRequest(){
	    pulseRuntime.requestCounter = Math.max(0, Number(pulseRuntime.requestCounter || 0)) + 1;
	    pulseRuntime.requestInFlight = pulseRuntime.requestCounter > 0;
	  }
	function endPulseRequest(){
	    pulseRuntime.requestCounter = Math.max(0, Number(pulseRuntime.requestCounter || 0) - 1);
	    pulseRuntime.requestInFlight = pulseRuntime.requestCounter > 0;
	}
	function pulseRequestBusy(){
	    return pulseRuntime.requestInFlight === true || pulseRuntime.sparkInFlight === true;
	}
	function mergeCharacterTuning(input){
	    const out = {};
	    Object.keys(CHARACTER_TUNING_DEFAULTS).forEach(id => {
	      out[id] = Object.assign({}, CHARACTER_TUNING_DEFAULTS[id], (input || {})[id] || {});
	      out[id].behaviorTree = Object.assign({}, CHARACTER_TUNING_DEFAULTS[id].behaviorTree || {}, ((input || {})[id] || {}).behaviorTree || {});
	      TUNING_FIELDS.forEach(([key]) => { out[id][key] = clamp(out[id][key], CHARACTER_TUNING_DEFAULTS[id][key]); });
	    });
	    return out;
	  }
	  function mergeCouncilTuning(input){
	    const out = Object.assign({}, COUNCIL_TUNING_DEFAULTS, input || {});
	    Object.keys(COUNCIL_TUNING_DEFAULTS).forEach(key => { out[key] = clamp(out[key], COUNCIL_TUNING_DEFAULTS[key]); });
	    return out;
	  }
	  function normalizePulseState(raw){
	    const state = Object.assign({}, DEFAULT, raw || {});
	    state.openPanels = Object.assign({}, DEFAULT.openPanels, raw?.openPanels || {});
	    state.openPanels.info = false;
	    state.openPanels.modes = false;
	    state.openPanels.archive = false;
	    state.openPanels.snapshot = false;
	    state.openPanels.tuning = false;
	    state.openPanels.apiKeys = false;
	    state.openPanels.composerTools = false;
	    state.openPanels.mediaActions = false;
	    state.characterTuning = mergeCharacterTuning(raw?.characterTuning || {});
	    state.councilTuning = mergeCouncilTuning(raw?.councilTuning || {});
	    state.relationships = (raw?.relationships && typeof raw.relationships === 'object') ? raw.relationships : {};
	    state.history = Array.isArray(raw?.history) ? raw.history.filter(Boolean).slice(0, 60) : [];
	    state.archiveThreads = Array.isArray(raw?.archiveThreads) ? raw.archiveThreads.filter(Boolean).slice(0, 80) : [];
	    state.savedChats = Array.isArray(raw?.savedChats) ? raw.savedChats.filter(Boolean).slice(0, 40) : [];
	    state.threadMessages = Array.isArray(raw?.threadMessages) ? raw.threadMessages.filter(Boolean).slice(-120) : [];
	    state.threadAttachments = Array.isArray(raw?.threadAttachments) ? raw.threadAttachments.filter(Boolean).slice(-24) : [];
	    state.threadWorkflows = WORKFLOWS_DISABLED ? [] : (Array.isArray(raw?.threadWorkflows) ? raw.threadWorkflows.filter(Boolean).slice(-12) : []);
	    state.activeWorkflowDraft = WORKFLOWS_DISABLED ? null : (raw?.activeWorkflowDraft && typeof raw.activeWorkflowDraft === 'object' ? raw.activeWorkflowDraft : null);
	    state.workflowCommitCard = WORKFLOWS_DISABLED ? null : (raw?.workflowCommitCard && typeof raw.workflowCommitCard === 'object' ? raw.workflowCommitCard : null);
	    state.uiState = {
	      commitCards: Object.fromEntries(
	        Object.entries((raw?.uiState && typeof raw.uiState === 'object' && raw.uiState.commitCards && typeof raw.uiState.commitCards === 'object') ? raw.uiState.commitCards : {})
	          .map(([key, item]) => [
	            String(key || ''),
	            {
	              display: String(item?.display || 'hint'),
	              fingerprint: String(item?.fingerprint || '')
	            }
	          ])
	          .filter(([key]) => key)
	      )
	    };
	    state.workflowIntentDraft = WORKFLOWS_DISABLED ? '' : String(raw?.workflowIntentDraft || '');
	    state.activeThreadId = normalizeThreadIdLike(raw?.activeThreadId || '');
	    state.activeThreadTitle = String(raw?.activeThreadTitle || '');
	    state.activeThreadStatus = String(raw?.activeThreadStatus || 'active');
	    state.activeThreadIncludeInContext = raw?.activeThreadIncludeInContext !== false;
	    state.holdBlankThread = raw?.holdBlankThread === true;
	    state.showSparkLane = raw?.showSparkLane !== false;
	    state.composerDraft = String(raw?.composerDraft || '');
	    state.replyTarget = raw?.replyTarget && typeof raw.replyTarget === 'object'
	      ? {
	          eventId: String(raw.replyTarget.eventId || ''),
	          threadId: normalizeThreadIdLike(raw.replyTarget.threadId || ''),
	          speakerId: sanitizePulseTarget(raw.replyTarget.speakerId || ''),
	          lane: String(raw.replyTarget.lane || ''),
	          kind: String(raw.replyTarget.kind || ''),
	          preview: String(raw.replyTarget.preview || '')
	        }
	      : null;
	    state.selectedTuningChar = CHARACTER_TUNING_DEFAULTS[state.selectedTuningChar] ? state.selectedTuningChar : 'aisha';
	    return state;
	  }
	  function preparePulseLaunchState(raw){
	    const state = normalizePulseState(raw);
	    state.activeThreadId = '';
	    state.activeThreadTitle = '';
	    state.activeThreadStatus = 'active';
	    state.activeThreadIncludeInContext = true;
	    state.holdBlankThread = true;
	    state.replyTarget = null;
	    state.threadMessages = [];
	    state.threadAttachments = [];
	    state.threadWorkflows = [];
	    state.activeWorkflowDraft = null;
	    state.workflowCommitCard = null;
	    state.workflowIntentDraft = '';
	    state.lastResponse = null;
	    state.lastMeta = null;
	    state.roomRuntime = null;
	    return state;
	  }
	  function loadPulse(){
    const fallbackKeys = ['silva_studio_pulse_v4014_hard_cut_rebuild', 'silva_studio_pulse_v395'];
    try {
      const primary = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (primary && typeof primary === 'object' && Object.keys(primary).length) return preparePulseLaunchState(primary);
      for (const key of fallbackKeys) {
        const raw = JSON.parse(localStorage.getItem(key) || '{}');
        if (raw && typeof raw === 'object' && Object.keys(raw).length) return preparePulseLaunchState(raw);
      }
      return preparePulseLaunchState({});
    } catch(e){
      return preparePulseLaunchState({});
    }
  }
	  function providerDefaults(){
	    return {
	      textPrimary:{provider:'gemini', model:'gemini-2.5-flash', apiKey:''},
	      imagePrimary:{provider:'nanobanana', model:'', apiKey:''},
	      fallback1:{provider:'gemini', model:'', apiKey:''},
	      fallback2:{provider:'manual', model:'', apiKey:''},
	      pulseApiKeys:[],
	      notes:''
	    };
	  }
	  function providerEntryId(idx){ return `pulse-key-${Date.now()}-${idx}-${Math.random().toString(36).slice(2,7)}`; }
	  function normalizeProviderEntry(entry, idx){
	    const src = entry && typeof entry === 'object' ? entry : {};
	    return {
	      id: String(src.id || providerEntryId(idx)),
	      label: String(src.label || src.name || `Fallback ${idx + 1}`),
	      provider: String(src.provider || 'gemini'),
	      model: String(src.model || 'gemini-2.5-flash'),
	      apiKey: String(src.apiKey || ''),
	      enabled: src.enabled !== false
	    };
	  }
	  function normalizeProviderConfig(raw){
	    const base = Object.assign({}, providerDefaults(), raw || {});
	    const migrated = [];
	    [base.textPrimary, base.fallback1, base.fallback2].forEach((item, idx) => {
	      if (!item || !item.apiKey || !String(item.provider || '').toLowerCase().includes('gemini')) return;
	      migrated.push({
	        id: providerEntryId(idx),
	        label: idx === 0 ? 'Primary Gemini' : `Legacy fallback ${idx}`,
	        provider: item.provider || 'gemini',
	        model: item.model || 'gemini-2.5-flash',
	        apiKey: item.apiKey,
	        enabled: true
	      });
	    });
	    const existing = Array.isArray(base.pulseApiKeys) ? base.pulseApiKeys : [];
	    const seen = new Set();
	    base.pulseApiKeys = [...existing, ...migrated].map(normalizeProviderEntry).filter(item => {
	      if (!item.apiKey) return true;
	      const sig = `${item.provider}::${item.model}::${item.apiKey}`;
	      if (seen.has(sig)) return false;
	      seen.add(sig);
	      return true;
	    });
	    return base;
	  }
	  function readProviderSnapshot(){
	    let localCfg = {};
	    let backupCfg = {};
	    let stateCfg = {};
	    try { localCfg = JSON.parse(localStorage.getItem(PROVIDER_KEY) || '{}') || {}; } catch(e){}
	    try { backupCfg = JSON.parse(localStorage.getItem(PROVIDER_BACKUP_KEY) || '{}') || {}; } catch(e){}
	    try { stateCfg = (window.STATE && STATE.providerSettings && typeof STATE.providerSettings === 'object') ? STATE.providerSettings : {}; } catch(e){}
	    return normalizeProviderConfig(Object.assign({}, stateCfg || {}, backupCfg || {}, localCfg || {}));
	  }
	  function loadProviderShell(){
	    try { return readProviderSnapshot(); }
	    catch(e){ return normalizeProviderConfig({}); }
	  }
	  function saveProviderShell(cfg){
	    const next = normalizeProviderConfig(cfg);
	    try { localStorage.setItem(PROVIDER_KEY, JSON.stringify(next)); } catch(e){}
	    try { localStorage.setItem(PROVIDER_BACKUP_KEY, JSON.stringify(next)); } catch(e){}
	    try {
	      window.STATE = window.STATE || {};
	      STATE.providerSettings = Object.assign({}, STATE.providerSettings || {});
	      STATE.providerSettings.defaultTextProvider = next.textPrimary.provider || 'gemini';
	      STATE.providerSettings.defaultImageProvider = next.imagePrimary.provider || 'nanobanana';
	      STATE.providerSettings.textPrimary = clone(next.textPrimary || {});
	      STATE.providerSettings.imagePrimary = clone(next.imagePrimary || {});
	      STATE.providerSettings.fallback1 = clone(next.fallback1 || {});
	      STATE.providerSettings.fallback2 = clone(next.fallback2 || {});
	      STATE.providerSettings.pulseApiKeys = clone(next.pulseApiKeys || []);
	      STATE.providerSettings.notes = String(next.notes || '');
	      window.saveState && window.saveState({ reason:'studio_provider_keys' });
	      if (typeof window.syncStateToBackend === 'function' && window.location.protocol !== 'file:') {
	        setTimeout(function(){ try { window.syncStateToBackend('studio_provider_keys'); } catch(e){} }, 40);
	      }
	    } catch(e){}
	    return next;
	  }
	  function clearPulseTimers(){
	    (pulseRuntime.timers || []).forEach(id => clearTimeout(id));
	    pulseRuntime.timers = [];
	    pulseRuntime.currentThinking = null;
	  }
	  function clearSparkTimer(){
	    if (pulseRuntime.sparkTimer) clearTimeout(pulseRuntime.sparkTimer);
	    pulseRuntime.sparkTimer = null;
	  }
	  function composerDraftValue(){
	    return String(pulseState.composerDraft || '');
	  }
	  function setComposerDraft(value, opts){
	    const options = opts || {};
	    pulseState.composerDraft = String(value == null ? '' : value);
	    pulseRuntime.composerDirty = Boolean(String(pulseState.composerDraft || '').trim());
	    if (options.persist) savePulse();
	    return pulseState.composerDraft;
	  }
	  function clearComposerDraft(opts){
	    const options = opts || {};
	    setComposerDraft('', { persist: options.persist === true });
	    pulseRuntime.composerSelectionStart = 0;
	    pulseRuntime.composerSelectionEnd = 0;
	    pulseRuntime.composerFocused = false;
	  }
	  function captureComposerState(){
	    const input = byId('sp-input');
	    if (!input) return;
	    pulseRuntime.composerFocused = document.activeElement === input;
	    pulseRuntime.composerSelectionStart = Number.isFinite(Number(input.selectionStart)) ? Number(input.selectionStart) : composerDraftValue().length;
	    pulseRuntime.composerSelectionEnd = Number.isFinite(Number(input.selectionEnd)) ? Number(input.selectionEnd) : pulseRuntime.composerSelectionStart;
	    if (String(input.value || '') !== composerDraftValue()) setComposerDraft(input.value || '');
	  }
	  function restoreComposerState(){
	    const input = byId('sp-input');
	    if (!input) return;
	    const draft = composerDraftValue();
	    if (String(input.value || '') !== draft) input.value = draft;
	    if (!pulseRuntime.composerFocused) return;
	    const start = Math.max(0, Math.min(draft.length, Number(pulseRuntime.composerSelectionStart || 0)));
	    const end = Math.max(start, Math.min(draft.length, Number(pulseRuntime.composerSelectionEnd || start)));
	    input.focus();
	    try { input.setSelectionRange(start, end); } catch(e){}
	  }
	  function textValue(value){
	    if (value == null) return '';
	    if (typeof value === 'string') return value.trim();
	    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	    if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(' · ');
	    if (typeof value === 'object') {
	      for (const key of ['text','note','summary','perspective','message','value','content']) {
	        const found = textValue(value[key]);
	        if (found) return found;
	      }
	      return Object.entries(value).slice(0, 5).map(([key, item]) => `${key}: ${textValue(item)}`).filter(Boolean).join(' · ');
	    }
	    return String(value).trim();
	  }
	  function historyKey(item){
	    return [String(item?.q || '').trim(), String(item?.mode || 'direction').trim(), String(item?.summary || '').trim()].join('::');
	  }
	  function mergePulseHistory(existing, incoming){
	    const out = [];
	    const seen = new Set();
	    [...(incoming || []), ...(existing || [])].forEach(item => {
	      const q = String(item?.q || '').trim();
	      if (!q) return;
	      const next = {
	        id: item.id || '',
	        q,
	        mode: String(item.mode || 'direction'),
	        ts: String(item.ts || ''),
	        summary: textValue(item.summary || item.aishaFinal || ''),
	        saved: Boolean(item.saved),
	        threadId: String(item.threadId || ''),
	        threadTitle: String(item.threadTitle || item.title || ''),
	        threadStatus: String(item.threadStatus || item.status || '')
	      };
	      const key = historyKey(next);
	      if (seen.has(key)) return;
	      seen.add(key);
	      out.push(next);
	    });
	    return out.slice(0, 40);
	  }
	  function normalizeArchiveThread(item){
	    if (!item || !item.id) return null;
	    const meta = item.meta && typeof item.meta === 'object' ? item.meta : {};
	    return {
	      id: String(item.id || ''),
	      title: String(item.title || meta.title || 'Untitled room'),
	      status: String(item.status || 'active'),
	      pinned: Boolean(item.pinned),
	      includeInContext: item.includeInContext !== false,
	      ts: String(item.updatedAt || item.lastMessageAt || item.createdAt || ''),
	      messageCount: Number(item.messageCount || (Array.isArray(item.messages) ? item.messages.length : 0) || 0),
	      mode: String(meta.mode || '')
	    };
	  }
	  function mergeArchiveThreads(existing, incoming){
	    const out = [];
	    const seen = new Set();
	    [...(incoming || []), ...(existing || [])].forEach(item => {
	      const next = normalizeArchiveThread(item);
	      if (!next || seen.has(next.id)) return;
	      seen.add(next.id);
	      out.push(next);
	    });
	    return out.slice(0, 80);
	  }
	  function normalizePulseAttachment(item){
	    if (!item || typeof item !== 'object') return null;
	    return {
	      id: String(item.id || ''),
	      threadId: String(item.threadId || item.thread_id || ''),
	      workflowId: String(item.workflowId || item.workflow_id || ''),
	      name: String(item.name || 'Untitled asset'),
	      mimeType: String(item.mimeType || item.mime_type || 'application/octet-stream'),
	      kind: String(item.kind || 'file'),
	      source: String(item.source || 'upload'),
	      previewUrl: String(item.previewUrl || item.preview_url || item.dataUrl || ''),
	      dataUrl: String(item.dataUrl || ''),
	      textExtract: String(item.textExtract || item.text_extract || item.textContent || ''),
	      createdAt: String(item.createdAt || item.created_at || '')
	    };
	  }
	  function normalizePulseWorkflow(item){
	    if (!item || typeof item !== 'object') return null;
	    return {
	      ...item,
	      id: String(item.id || ''),
	      threadId: String(item.threadId || item.thread_id || ''),
	      intent: String(item.intent || 'room-chat'),
	      workflowClass: String(item.workflowClass || item.workflow_class || 'room-chat'),
	      status: String(item.status || 'draft'),
	      createdBy: String(item.createdBy || item.created_by || 'aisha')
	    };
	  }
	  function normalizePulseCommitCard(item){
	    if (!item || typeof item !== 'object') return null;
	    return {
	      workflowId: String(item.workflowId || ''),
	      ownerSpeakerId: String(item.ownerSpeakerId || 'aisha'),
	      summary: String(item.summary || ''),
	      missingFields: Array.isArray(item.missingFields) ? item.missingFields.filter(Boolean) : [],
	      ready: item.ready === true,
	      actions: Array.isArray(item.actions) ? item.actions.filter(Boolean) : []
	    };
	  }
	  function workflowCommitFingerprint(workflow, card){
	    const workflowId = String(workflow?.id || card?.workflowId || '').trim();
	    const status = String(workflow?.status || '').trim().toLowerCase();
	    const ready = card?.ready === true ? '1' : '0';
	    const summary = String(card?.summary || '').trim();
	    const missing = Array.isArray(card?.missingFields) ? card.missingFields.filter(Boolean).join('|') : '';
	    const actions = Array.isArray(card?.actions) ? card.actions.filter(Boolean).join('|') : '';
	    return [workflowId, status, ready, summary, missing, actions].join('::');
	  }
	  function workflowCommitDisplayKey(workflow){
	    const workflowId = String(workflow?.id || '').trim();
	    const threadId = normalizeThreadIdLike(workflow?.threadId || pulseState.activeThreadId || '');
	    if (!workflowId && !threadId) return '';
	    return `commit-ui-v3::${threadId || 'pulse'}::${workflowId || 'workflow'}`;
	  }
	  function workflowClassOf(workflow){
	    const intent = String(workflow?.intent || '').trim().toLowerCase();
	    const explicit = String(workflow?.workflowClass || '').trim().toLowerCase();
	    if (explicit) return explicit;
	    if (intent === 'analyze-media') return 'analysis';
	    if (['plan-post','make-image','plan-calendar','plan-event','commit-plan'].includes(intent)) return 'committable';
	    return 'room-chat';
	  }
	  function commitCardUiState(key){
	    const uiState = pulseState.uiState && typeof pulseState.uiState === 'object' ? pulseState.uiState : {};
	    const commitCards = uiState.commitCards && typeof uiState.commitCards === 'object' ? uiState.commitCards : {};
	    return key ? (commitCards[key] || null) : null;
	  }
	  function rememberCommitCardUiState(key, display, fingerprint){
	    if (!key) return;
	    pulseState.uiState = pulseState.uiState && typeof pulseState.uiState === 'object' ? pulseState.uiState : { commitCards:{} };
	    pulseState.uiState.commitCards = pulseState.uiState.commitCards && typeof pulseState.uiState.commitCards === 'object' ? pulseState.uiState.commitCards : {};
	    pulseState.uiState.commitCards[key] = {
	      display: String(display || 'hint'),
	      fingerprint: String(fingerprint || '')
	    };
	  }
	  function syncPulseWorkflowPayload(payload){
	    pulseState.threadAttachments = Array.isArray(payload?.attachments) ? payload.attachments.map(normalizePulseAttachment).filter(Boolean).slice(-24) : pulseState.threadAttachments || [];
	    pulseState.threadWorkflows = WORKFLOWS_DISABLED
	      ? []
	      : (Array.isArray(payload?.workflows) ? payload.workflows.map(normalizePulseWorkflow).filter(Boolean).slice(-12) : pulseState.threadWorkflows || []);
	    const payloadWorkflow = WORKFLOWS_DISABLED ? null : (payload?.workflowDraft ? normalizePulseWorkflow(payload.workflowDraft) : null);
	    pulseState.activeWorkflowDraft = WORKFLOWS_DISABLED
	      ? null
	      : (payloadWorkflow && !['committed','commit_failed'].includes(String(payloadWorkflow.status || '').toLowerCase())
	        ? payloadWorkflow
	        : ((pulseState.threadWorkflows || []).find(item => !['committed','commit_failed'].includes(String(item.status || '').toLowerCase())) || null));
	    pulseState.workflowCommitCard = null;
	    pulseState.workflowIntentDraft = '';
	  }
	  async function refreshPulseHistory(shouldRender, options){
	    beginPulseRequest();
	    try{
	      const explicitThreadId = String(options?.threadId || '').trim();
	      const requestedThreadId = explicitThreadId || String(pulseState.activeThreadId || '').trim();
	      const preserveBlank = options?.preserveBlank !== false;
	      const query = requestedThreadId ? `?threadId=${encodeURIComponent(requestedThreadId)}` : '';
	      const res = await fetch('/api/studio/history' + query);
	      const payload = await res.json();
	      if (!payload?.ok || !Array.isArray(payload.turns)) return;
	      pulseState.history = mergePulseHistory(pulseState.history, payload.turns);
	      pulseState.archiveThreads = mergeArchiveThreads(pulseState.archiveThreads, payload.threads || []);
	      const holdBlank = pulseState.holdBlankThread === true && preserveBlank && !requestedThreadId;
	      if (!holdBlank && payload.thread?.id) {
	        pulseState.activeThreadId = String(payload.thread.id || '');
	        pulseState.activeThreadTitle = String(payload.thread.title || '');
	        pulseState.activeThreadStatus = String(payload.thread.status || 'active');
	        pulseState.activeThreadIncludeInContext = payload.thread.includeInContext !== false;
	      }
		      if (!holdBlank && Array.isArray(payload.messages)) {
		        pulseState.threadMessages = normalizeThreadMessages(payload.messages).slice(-120);
		        pulseState.threadAttachments = Array.isArray(payload.attachments) ? payload.attachments.map(normalizePulseAttachment).filter(Boolean).slice(-24) : [];
		        pulseState.threadWorkflows = WORKFLOWS_DISABLED ? [] : (Array.isArray(payload.workflows) ? payload.workflows.map(normalizePulseWorkflow).filter(Boolean).slice(-12) : []);
		        pulseState.activeWorkflowDraft = WORKFLOWS_DISABLED ? null : ((pulseState.threadWorkflows || []).find(item => !['committed','commit_failed'].includes(String(item.status || '').toLowerCase())) || null);
		        pulseState.workflowCommitCard = null;
		        pulseState.workflowIntentDraft = '';
	        if (!pulseRuntime.isSequencing && !Array.isArray(pulseRuntime.pendingThreadMessages)) {
	          pulseState.lastResponse = null;
	          pulseState.lastMeta = null;
	          pulseRuntime.activeQuestion = '';
	        }
	      } else if (holdBlank) {
	        pulseState.threadMessages = [];
	        pulseState.threadAttachments = [];
	        pulseState.threadWorkflows = [];
	        pulseState.activeWorkflowDraft = null;
	        pulseState.workflowCommitCard = null;
	      }
	      savePulse({ global:false, bridge:false });
	      if (shouldRender) renderStudioPulseHome();
	    }catch(e){}
	    finally { endPulseRequest(); }
	  }
	  function resetPulseThreadView(){
	    clearPulseTimers();
	    clearSparkTimer();
	    pulseRuntime.sequenceId += 1;
	    pulseRuntime.visibleCount = 0;
	    pulseRuntime.segments = [];
	    pulseRuntime.isSequencing = false;
	    pulseRuntime.activeQuestion = '';
	    pulseRuntime.currentThinking = null;
	    pulseRuntime.pendingThreadMessages = null;
	    pulseRuntime.scrollAutoFollow = true;
	    pulseRuntime.scrollGap = 0;
	    pulseState.activeThreadId = '';
	    pulseState.activeThreadTitle = '';
	    pulseState.activeThreadStatus = 'active';
	    pulseState.activeThreadIncludeInContext = true;
	    pulseState.holdBlankThread = true;
	    clearComposerDraft();
	    pulseState.replyTarget = null;
	    pulseState.threadMessages = [];
	    pulseState.threadAttachments = [];
	    pulseState.threadWorkflows = [];
	    pulseState.activeWorkflowDraft = null;
	    pulseState.workflowCommitCard = null;
	    pulseState.workflowIntentDraft = '';
	    pulseState.lastResponse = null;
	    pulseState.lastMeta = null;
	    collapseSecondaryChrome();
	    savePulse({ global:false, bridge:false });
	    renderStudioPulseHome();
	  }
	  async function openPulseThread(threadId){
	    const targetId = String(threadId || '').trim();
	    if (!targetId) return;
	    clearPulseTimers();
	    clearSparkTimer();
	    pulseRuntime.sequenceId += 1;
	    pulseRuntime.visibleCount = 0;
	    pulseRuntime.segments = [];
	    pulseRuntime.isSequencing = false;
	    pulseRuntime.activeQuestion = '';
	    pulseRuntime.currentThinking = null;
	    pulseRuntime.pendingThreadMessages = null;
	    pulseRuntime.scrollAutoFollow = true;
	    pulseRuntime.scrollGap = 0;
	    const target = (pulseState.archiveThreads || []).find(item => String(item.id || '') === targetId);
	    pulseState.activeThreadId = targetId;
	    pulseState.activeThreadTitle = String(target?.title || '');
	    pulseState.activeThreadStatus = String(target?.status || 'active');
	    pulseState.activeThreadIncludeInContext = target?.includeInContext !== false;
	    pulseState.replyTarget = null;
	    pulseState.holdBlankThread = false;
	    pulseState.threadAttachments = [];
	    pulseState.threadWorkflows = [];
	    pulseState.activeWorkflowDraft = null;
	    pulseState.workflowCommitCard = null;
	    pulseState.lastResponse = null;
	    pulseState.lastMeta = null;
	    collapseSecondaryChrome();
	    savePulse({ global:false, bridge:false });
	    await refreshPulseHistory(true, { threadId: targetId, preserveBlank: false });
	  }
	  function threadMessageSignature(item){
	    if (!item) return '';
	    const speakerId = String(item.speakerId || item.speaker_id || '').trim().toLowerCase();
	    const text = textValue(item.text || '').replace(/\s+/g, ' ').trim().toLowerCase();
	    if (!speakerId || !text) return '';
	    return `${speakerId}::${text}`;
	  }
	  function normalizeThreadMessages(messages){
	    const normalized = (Array.isArray(messages) ? messages : []).filter(Boolean).map(item => ({
	      id: String(item.id || ''),
	      threadId: String(item.threadId || item.thread_id || ''),
	      speakerId: String(item.speakerId || item.speaker_id || ''),
	      kind: String(item.kind || 'message'),
	      text: textValue(item.text || ''),
	      tone: String(item.tone || ''),
	      label: String(item.label || ''),
	      replyToId: String(item.replyToId || item.reply_to_id || ''),
	      targetSpeakerId: String(item.targetSpeakerId || item.target_speaker_id || ''),
	      targetType: String(item.targetType || item.target_type || ''),
	      metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
	      createdAt: String(item.createdAt || item.created_at || ''),
	      directTarget: String(item.directTarget || item.direct_target || '')
	    })).filter(item => item.text);
	    const byId = new Set();
	    const recentSignatures = [];
	    const deduped = [];
	    normalized.forEach(item => {
	      const id = String(item.id || '').trim();
	      if (id) {
	        if (byId.has(id)) return;
	        byId.add(id);
	      }
	      const isUser = String(item.speakerId || '').trim().toLowerCase() === 'user';
	      const signature = threadMessageSignature(item);
	      if (!isUser && signature) {
	        const alreadyRecent = recentSignatures.slice(-28).includes(signature);
	        if (alreadyRecent) return;
	        recentSignatures.push(signature);
	      }
	      deduped.push(item);
	    });
	    return deduped.slice(-120);
	  }
	  function stripModeContextLeak(text){
	    const raw = textValue(text || '');
	    if (!raw) return '';
	    return raw
	      .replace(/\s*Mode context for [^:]+:\s*[^.]+(?:\.[^.]*)*/gi, '')
	      .replace(/\s{2,}/g, ' ')
	      .trim();
	  }
	  function studioPulseOutageDisplayText(reason){
	    const normalized = String(reason || '').trim().toLowerCase();
	    if (normalized.includes('timeout')) return 'The room took too long to answer. Your message was saved - retry once or wait a moment.';
	    if (normalized.includes('invalid') || normalized.includes('malformed')) return 'The provider answered, but Studio Pulse blocked a malformed reply instead of showing bad room output. Your message was saved - retry once.';
	    return 'The room is still here. The Studio Pulse provider missed this turn, so I did not get a clean reply back. Your message was saved - retry once, and if it repeats we will check the Studio Pulse Gemini connection.';
	  }
	  function sanitizeStudioPulseSystemText(text){
	    const raw = textValue(text || '');
	    if (!raw) return '';
	    const legacyOutage = raw.match(/The room missed this turn\s*[—-]\s*provider\s+([a-z0-9_-]+)/i);
	    if (legacyOutage) return studioPulseOutageDisplayText(legacyOutage[1]);
	    if (/provider-unavailable/i.test(raw)) return raw.replace(/provider-unavailable/gi, 'the Studio Pulse provider');
	    return raw;
	  }
	  function visibleThreadText(item){
	    if (!item) return '';
	    if (String(item.speakerId || '').toLowerCase() === 'user') return stripModeContextLeak(item.text || '');
	    return sanitizeStudioPulseSystemText(item.text || '');
	  }
	  function previousThreadMessages(){
	    const msgs = normalizeThreadMessages(pulseState.threadMessages);
	    if (!msgs.length) return [];
	    return msgs.slice(-80);
	  }
	  function previousSparkMessages(limit = 8){
	    return previousThreadMessages().filter(item => String(item?.kind || '').toLowerCase() === 'spark').slice(-limit);
	  }
	  function previousMainThreadMessages(limit = 80){
	    return previousThreadMessages().filter(item => String(item?.kind || '').toLowerCase() !== 'spark').slice(-limit);
	  }
	  function clearComposerReplyTarget({ render = false } = {}){
	    pulseState.replyTarget = null;
	    savePulse({ global:false });
	    if (render) renderStudioPulseHome();
	  }
	  function setComposerReplyTarget(item){
	    if (!item || !String(item.id || '').trim()) return;
	    pulseState.replyTarget = {
	      eventId: String(item.id || '').trim(),
	      threadId: String(item.threadId || pulseState.activeThreadId || '').trim(),
	      speakerId: String(item.speakerId || '').trim().toLowerCase(),
	      lane: String(item.kind || '').trim().toLowerCase() === 'spark' ? 'spark' : 'main',
	      kind: String(item.kind || 'message').trim().toLowerCase(),
	      preview: textValue(item.text || '').slice(0, 180)
	    };
	    savePulse({ global:false });
	    renderStudioPulseHome();
	    const input = byId('sp-input');
	    if (input) input.focus();
	  }
	  function activeReplyTarget(){
	    const target = pulseState.replyTarget && typeof pulseState.replyTarget === 'object' ? pulseState.replyTarget : null;
	    if (!target) return null;
	    if (String(target.threadId || '').trim() !== String(pulseState.activeThreadId || '').trim()) return null;
	    if (!String(target.eventId || '').trim()) return null;
	    return target;
	  }
	  function replyTargetBannerMarkup(){
	    const target = activeReplyTarget();
	    if (!target) return '';
	    const speakerId = CHARS[target.speakerId] ? target.speakerId : 'studio';
	    const preview = target.preview ? esc(target.preview) : 'Continue this side-thread in the main lane.';
	    return `<div class="sp-reply-banner"><div><strong>Replying to ${esc(characterLabel(speakerId))} · ${esc(target.lane || 'main')}</strong><span>${preview}</span></div><button class="sp-reply-clear" type="button" id="sp-clear-reply">Clear</button></div>`;
	  }
	  function threadHistoryMessageMarkup(item){
	    const speakerId = item.speakerId === 'user' ? 'user' : (CHARS[item.speakerId] ? item.speakerId : 'studio');
	    const cleanText = visibleThreadText(item);
	    if (!cleanText && item.kind !== 'thinking') return '';
	    if (speakerId === 'user') {
	      return `<div class="sp-thread-msg is-user"><div class="sp-thread-msg-who">you</div><div class="sp-thread-msg-body">${esc(cleanText)}</div></div>`;
	    }
	    if (item.kind === 'thinking') {
	      return thinkingCard({ speaker: speakerId, kind: item.kind });
	    }
	    const tone = String(item.tone || '').replace(/[_-]+/g, ' ').trim();
	    const label = String(item.label || '').trim() || `${characterLabel(speakerId)}${tone ? ` · ${tone}` : ''}`;
	    const runtimePresence = roomIntelligenceRuntime().knownPresenceStatus || {};
	    const messageMeta = Object.assign({}, item, {
	      roomIntent: item.roomIntent || item.responseIntent || '',
	      presence: item.presence || runtimePresence[speakerId] || '',
	      emotionalState: item.emotionalState || tone || ''
	    });
	    const kind = String(item.kind || '').toLowerCase();
	    if (kind === 'spark') {
	      const extraClass = `${item.extraClass || ''} is-spark`.trim();
	      return `<div class="sp-voice-card ${extraClass}" style="--speaker-color:${esc(characterColor(speakerId))}"><div class="who"><span>${esc(label || characterLabel(speakerId))}</span></div><div class="say">${esc(cleanText || '—')}</div>${roomMessageMetaMarkup(messageMeta)}<div class="sp-spark-actions"><button class="sp-spark-reply" type="button" data-reply-spark="${esc(item.id || '')}">Reply in thread</button></div></div>`;
	    }
	    const extraClass = `${item.extraClass || ''}`.trim();
	    return voiceCard(speakerId, label, cleanText, extraClass, messageMeta);
	  }
	  function threadLaneMarkup(items, kind){
	    const filtered = (Array.isArray(items) ? items : []).filter(item => {
	      if (!item || (!item.text && item.kind !== 'thinking')) return false;
	      if (kind === 'spark') return item.kind === 'spark';
	      return item.kind !== 'spark';
	    });
	    return filtered.map(threadHistoryMessageMarkup).filter(Boolean).join('');
	  }
	  function normalizeSegmentLabel(segment){
	    const speakerId = CHARS[segment?.speaker] ? segment.speaker : 'studio';
	    const explicit = String(segment?.label || '').trim();
	    if (explicit) return explicit;
	    const tone = String(segment?.kind || 'message').replace(/[_-]+/g, ' ').trim();
	    return `${characterLabel(speakerId)}${tone ? ` · ${tone}` : ''}`;
	  }
	  function currentTurnThreadItems(resp){
	    if (!shouldDetachCurrentTurn()) return [];
	    const items = [];
	    const activeQuestion = stripModeContextLeak(pulseRuntime.activeQuestion || '');
	    if (activeQuestion) {
	      items.push({ id:`active_user_${pulseRuntime.sequenceId}`, speakerId:'user', kind:'user', text:activeQuestion });
	    }
	    visiblePulseSegments(resp).forEach((segment, index) => {
	      items.push({
	        id:`active_${pulseRuntime.sequenceId}_${index}`,
	        speakerId: segment.speaker,
	        kind: segment.kind || 'message',
	        text: textValue(segment.text || ''),
	        label: normalizeSegmentLabel(segment),
	        extraClass: segment.extraClass || '',
	        roomIntent: segment.roomIntent || segment.responseIntent || '',
	        presence: segment.presence || '',
	        emotionalState: segment.emotionalState || ''
	      });
	    });
	    if (pulseRuntime.isSequencing && pulseRuntime.currentThinking?.speaker) {
	      items.push({
	        id:`thinking_${pulseRuntime.sequenceId}_${pulseRuntime.visibleCount}`,
	        speakerId: pulseRuntime.currentThinking.speaker,
	        kind:'thinking',
	        text:''
	      });
	    }
	    return items.filter(item => String(item?.kind || '').toLowerCase() !== 'spark');
	  }
	  function liveRoomItems(resp){
	    const historyItems = previousMainThreadMessages();
	    return historyItems.concat(currentTurnThreadItems(resp));
	  }
	  function sparkLaneMarkup(){
	    const items = previousSparkMessages();
	    if (!items.length) return `<div class="sp-spark-lane is-empty" id="sp-spark-lane"></div>`;
	    const isOpen = pulseState.showSparkLane !== false;
	    return `<div class="sp-spark-lane ${isOpen ? 'is-open' : 'is-collapsed'}" id="sp-spark-lane"><button class="sp-spark-head" id="sp-toggle-sparks" type="button"><span>Room sparks</span><span>${items.length}</span><span>${isOpen ? '−' : '+'}</span></button>${isOpen ? `<div class="sp-spark-live">${items.map(threadHistoryMessageMarkup).filter(Boolean).join('')}</div>` : ''}</div>`;
	  }
	  function liveThreadLaneMarkup(resp){
	    const items = liveRoomItems(resp);
	    if (!items.length) {
	      return `<div class="sp-response-summary" id="sp-summary">The room is ready. Ask something real and it will stay with the thread.</div>`;
	    }
	    return `<div class="sp-thread-turn is-live">${items.map(threadHistoryMessageMarkup).filter(Boolean).join('')}</div>`;
	  }
	  function archiveCurrentPulse(){
	    const q = String(pulseRuntime.activeQuestion || pulseState.history?.[0]?.q || '').trim();
	    if (!q || !pulseState.lastResponse) return false;
	    const item = {
	      threadId: String(pulseState.activeThreadId || ''),
	      title: String(pulseState.activeThreadTitle || q),
	      status: String(pulseState.activeThreadStatus || 'active'),
	      q,
	      mode: String(pulseState.lastMeta?.mode || pulseState.mode || 'direction'),
	      ts: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
	      summary: textValue(pulseState.lastResponse?.aishaFinal || pulseState.lastResponse?.summary || '')
	    };
	    const key = historyKey(item);
	    pulseState.savedChats = Array.isArray(pulseState.savedChats) ? pulseState.savedChats : [];
	    if (pulseState.savedChats.some(entry => historyKey(entry) === key)) return false;
	    pulseState.savedChats.unshift(item);
	    pulseState.savedChats = pulseState.savedChats.slice(0, 30);
	    savePulse();
	    return true;
	  }
	  async function patchActiveThreadStatus(status){
	    const threadId = String(pulseState.activeThreadId || '').trim();
	    if (!threadId || window.location.protocol === 'file:') return false;
	    try {
	      const res = await fetch(`/api/studio/threads/${encodeURIComponent(threadId)}`, {
	        method:'PATCH',
	        headers:{ 'Content-Type':'application/json' },
	        body: JSON.stringify({ status })
	      });
	      const payload = await res.json();
	      if (!payload?.ok || !payload?.thread) return false;
	      pulseState.activeThreadStatus = String(payload.thread.status || status || 'active');
	      savePulse();
	      return true;
	    } catch (e) {
	      return false;
	    }
	  }
	  function beginNewPulseThread(){
	    resetPulseThreadView();
	  }
	  function pulseSegmentsFromResponse(resp){
	    const r = normalizePulseResponse(resp || {});
	    if (Array.isArray(r.messageEvents) && r.messageEvents.length) {
	      return r.messageEvents
	        .filter(item => item && item.visible !== false && item.kind !== 'thinking' && textValue(item.text || ''))
	        .map(item => {
	          const speaker = CHARS[item.speakerId] ? item.speakerId : (CHARS[item.speaker] ? item.speaker : 'studio');
	          const tone = String(item.role || item.tone || item.kind || '').replace(/[_-]+/g, ' ').trim();
	          const label = `${characterLabel(speaker)}${tone ? ` · ${tone}` : ''}`;
	          const extra = `${speaker === 'aisha' ? 'is-aisha ' : ''}${item.kind === 'reaction' ? 'sp-tension ' : ''}${item.kind === 'spark' ? 'is-spark' : ''}`.trim();
	          return {
	            speaker,
	            label,
	            text: sanitizeStudioPulseSystemText(item.text || ''),
	            extraClass: extra,
	            kind: item.kind || 'message',
	            delayMs: Number(item.delayMs || 0),
	            roomIntent: item.roomIntent || item.responseIntent || '',
	            presence: item.presence || '',
	            emotionalState: item.emotionalState || '',
	            trace: item.trace || ''
	          };
	        })
	        .filter(item => item.text);
	    }
	    const segments = [];
	    if (r.aishaFrame) segments.push({ speaker:'aisha', label:'Aisha Motsepe · chair', text:textValue(r.aishaFrame), extraClass:'is-aisha', kind:'frame' });
	    if (r.departmentPerspective) segments.push({ speaker:r.departmentLead, label:`${characterLabel(r.departmentLead)} · department lead`, text:textValue(r.departmentPerspective), kind:'lead' });
	    (r.councilNotes || []).forEach(item => {
	      if (item?.text) segments.push({ speaker:item.speaker, label:`${characterLabel(item.speaker)} · ${item.stance || 'council note'}`, text:textValue(item.text), kind:'council' });
	    });
	    (r.teamTension || []).forEach(item => {
	      if (item?.text) segments.push({ speaker:item.from || 'aisha', label:`${characterLabel(item.from)}${item.to ? ' to ' + characterLabel(item.to) : ''} · tension`, text:textValue(item.text), extraClass:'sp-tension', kind:'tension' });
	    });
	    if (r.aishaFinal) segments.push({ speaker:'aisha', label:'Aisha Motsepe · final call', text:textValue(r.aishaFinal), extraClass:'is-aisha', kind:'final' });
	    return segments;
	  }
	  function pulseSegmentDelay(segment, index, total){
	    const explicit = Number(segment?.delayMs || 0);
	    if (Number.isFinite(explicit) && explicit > 0) return explicit;
	    const kind = segment?.kind || 'council';
	    const ranges = {
	      frame:[1350, 2300],
	      lead:[1850, 3200],
	      council:[1500, 2750],
	      tension:[1700, 2950],
	      final:[2100, 3600],
	      spark:[850, 1600],
	      reaction:[900, 1700],
	      message:[1000, 1900]
	    };
	    const [min, max] = ranges[kind] || [520, 920];
	    const base = min + Math.random() * (max - min);
	    const gap = 420 + Math.random() * 920;
	    return Math.round(base + gap + (index === total - 1 ? 240 : 0));
	  }
	  function thinkingCard(thinking){
	    if (!thinking?.speaker) return '';
	    const speakerId = CHARS[thinking.speaker] ? thinking.speaker : 'studio';
	    return `<div class="sp-voice-card is-thinking" style="--speaker-color:${esc(characterColor(speakerId))}"><div class="who"><span>${esc(characterLabel(speakerId))} · thinking</span></div><div class="say"><span class="sp-typing-dots"><span></span><span></span><span></span></span></div></div>`;
	  }
	  function captureThreadScrollState(){
	    const wrap = byId('sp-response-wrap');
	    if (!wrap) return;
	    const gap = Math.max(0, wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight);
	    pulseRuntime.scrollGap = gap;
	    pulseRuntime.scrollAutoFollow = gap < 80;
	  }
	  function restoreThreadScrollState(forceBottom){
	    const wrap = byId('sp-response-wrap');
	    if (!wrap) return;
	    if (forceBottom || pulseRuntime.scrollAutoFollow) {
	      wrap.scrollTop = wrap.scrollHeight;
	      return;
	    }
	    const target = Math.max(0, wrap.scrollHeight - wrap.clientHeight - Math.max(0, pulseRuntime.scrollGap || 0));
	    wrap.scrollTop = target;
	  }
	  function bindThreadScroll(){
	    const wrap = byId('sp-response-wrap');
	    if (!wrap) return;
	    wrap.onscroll = () => {
	      const gap = Math.max(0, wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight);
	      pulseRuntime.scrollGap = gap;
	      pulseRuntime.scrollAutoFollow = gap < 80;
	    };
	  }
	  function notesToggleMarkup(resp){
	    const showThinking = pulseState.showThinking === true;
	    const showNotesToggle = resp && !isLightRoomTurn(resp) && Boolean((resp?.actions || []).length || (resp?.consistencyChecks || []).length || (resp?.suggestedAssets || []).length || (resp?.promptIdeas || []).length || (resp?.relationshipDeltas || []).length);
	    if (!shouldDetachCurrentTurn() || !showNotesToggle) return '';
	    return `<div class="sp-thinking-row" id="sp-toggle-row"><button class="sp-thinking-toggle" id="sp-toggle-thinking" type="button"><span class="sp-thinking-glyph">✦</span><span>${showThinking ? 'Hide room notes' : 'Show room notes'}</span><span style="opacity:.75">${showThinking ? '⌃' : '⌄'}</span></button></div>`;
	  }
	  function patchSequenceDom(resp){
	    const live = byId('sp-thread-live');
	    const spark = byId('sp-spark-slot');
	    const toggleRow = byId('sp-toggle-row-wrap');
	    if (!live) return false;
	    captureThreadScrollState();
	    if (spark) spark.innerHTML = sparkLaneMarkup();
	    live.innerHTML = liveThreadLaneMarkup(resp);
	    if (toggleRow) toggleRow.innerHTML = notesToggleMarkup(resp);
	    restoreThreadScrollState();
	    return true;
	  }
	  function startPulseSequence(resp, question){
	    clearPulseTimers();
	    pulseRuntime.sequenceId += 1;
	    pulseRuntime.segments = pulseSegmentsFromResponse(resp);
	    pulseRuntime.visibleCount = 0;
	    pulseRuntime.isSequencing = pulseRuntime.segments.length > 0;
	    pulseRuntime.activeQuestion = String(question || '');
	    pulseRuntime.scrollAutoFollow = true;
	    pulseRuntime.scrollGap = 0;
	    const sequenceId = pulseRuntime.sequenceId;
	    if (!pulseRuntime.segments.length) {
	      pulseRuntime.isSequencing = false;
	      pulseRuntime.currentThinking = null;
	      if (Array.isArray(pulseRuntime.pendingThreadMessages)) {
	        pulseState.threadMessages = pulseRuntime.pendingThreadMessages.slice(-120);
	        pulseRuntime.pendingThreadMessages = null;
	        savePulse({ global:false, bridge:false });
	      }
	      renderStudioPulseHome();
	      return;
	    }
	    renderStudioPulseHome();
	    let elapsed = 680 + Math.round(Math.random() * 420);
	    pulseRuntime.segments.forEach((segment, index) => {
	      const leadIn = Math.round(520 + Math.random() * 920);
	      elapsed += leadIn;
	      const thinkingTimer = setTimeout(() => {
	        if (sequenceId !== pulseRuntime.sequenceId) return;
	        pulseRuntime.currentThinking = { speaker: segment.speaker, kind: segment.kind };
	        if (!patchSequenceDom(resp)) renderStudioPulseHome();
	      }, elapsed);
	      pulseRuntime.timers.push(thinkingTimer);
	      elapsed += pulseSegmentDelay(segment, index, pulseRuntime.segments.length);
	      const revealTimer = setTimeout(() => {
	        if (sequenceId !== pulseRuntime.sequenceId) return;
	        pulseRuntime.currentThinking = null;
	        pulseRuntime.visibleCount = index + 1;
	        pulseRuntime.isSequencing = index < pulseRuntime.segments.length - 1;
	        if (!pulseRuntime.isSequencing) pulseRuntime.currentThinking = null;
	        if (!pulseRuntime.isSequencing && Array.isArray(pulseRuntime.pendingThreadMessages)) {
	          pulseState.threadMessages = pulseRuntime.pendingThreadMessages.slice(-120);
	          pulseRuntime.pendingThreadMessages = null;
	          savePulse({ global:false, bridge:false });
	          renderStudioPulseHome();
	          return;
	        }
	        if (!patchSequenceDom(resp)) renderStudioPulseHome();
	      }, elapsed);
	      pulseRuntime.timers.push(revealTimer);
	    });
	  }
	  function visiblePulseSegments(resp){
	    const fallback = pulseSegmentsFromResponse(resp);
	    if (!pulseRuntime.segments.length) return fallback;
	    return pulseRuntime.segments.slice(0, Math.max(pulseRuntime.visibleCount, pulseRuntime.isSequencing ? 0 : pulseRuntime.segments.length));
	  }
	  function iconMarkup(name){
	    if (name === 'tools') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10"/><path d="M17 7h3"/><path d="M9 7a2 2 0 1 0 0 .01"/><path d="M4 17h3"/><path d="M10 17h10"/><path d="M15 17a2 2 0 1 0 0 .01"/></svg>`;
	    if (name === 'providers') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14a4 4 0 1 1 0-8 4 4 0 0 1 4 4"/><path d="M11 10h8"/><path d="M16 10v4"/><path d="M19 10v2"/></svg>`;
	    if (name === 'plus') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
	    if (name === 'spark') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3 5 14h6l-1 7 9-12h-6z"/></svg>`;
	    if (name === 'sparkTrigger') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.9 4.8 12.6 9.2 17 10.9 12.6 12.6 10.9 17 9.2 12.6 4.8 10.9 9.2 9.2Z"/><path d="M17.4 4.9 18.1 6.4 19.6 7.1 18.1 7.8 17.4 9.3 16.7 7.8 15.2 7.1 16.7 6.4Z"/></svg>`;
	    if (name === 'remove') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>`;
	    return '';
	  }
	  function bridgePulseHomesIntoState(){
	    try{
	      window.STATE = window.STATE || {};
      STATE.homeProfiles = STATE.homeProfiles || {};
      STATE.homeAssets = STATE.homeAssets || {};
	      STATE.teamRecords = STATE.teamRecords || {};
	      STATE.pulseHomes = STATE.pulseHomes || {};
	      STATE.characterTuning = Object.assign({}, STATE.characterTuning || {}, clone(pulseState.characterTuning));
	      STATE.councilTuning = Object.assign({}, STATE.councilTuning || {}, clone(pulseState.councilTuning));
	      STATE.characterBehaviorTree = buildCharacterBehaviorTreePayload();
	      STATE.councilBehavior = buildCouncilBehaviorPayload();
	      STATE.relationships = Object.assign({}, STATE.relationships || {}, clone(pulseState.relationships));
	      STATE.personhood = STATE.personhood || { profiles:{}, liveState:{}, relationships:{} };
	      const runtimeRoom = pulseState.roomRuntime && typeof pulseState.roomRuntime === 'object' ? pulseState.roomRuntime : {};
	      const runtimePersonhood = runtimeRoom.personhood && typeof runtimeRoom.personhood === 'object' ? runtimeRoom.personhood : {};
	      STATE.personhood.profiles = Object.assign({}, STATE.personhood.profiles || {}, runtimePersonhood.profiles || {});
	      STATE.personhood.liveState = Object.assign({}, STATE.personhood.liveState || {}, buildLiveStatePayload(), runtimePersonhood.liveState || {});
	      STATE.personhood.relationships = Object.assign({}, STATE.personhood.relationships || {}, clone(pulseState.relationships));
	      STATE.personhood.peerObservations = clone(runtimePersonhood.peerObservations || STATE.personhood.peerObservations || {});
	      STATE.personhood.holding = clone(runtimePersonhood.holding || STATE.personhood.holding || {});
	      STATE.personhood.autonomyQueue = clone(runtimePersonhood.autonomyQueue || STATE.personhood.autonomyQueue || {});
	      STATE.personhood.salienceMemory = clone(runtimePersonhood.salienceMemory || STATE.personhood.salienceMemory || {});
	      STATE.personhood.relationshipEvents = clone(runtimePersonhood.relationshipEvents || STATE.personhood.relationshipEvents || []);
	      STATE.personhood.relationshipEdges = clone(runtimePersonhood.relationshipEdges || STATE.personhood.relationshipEdges || {});
	      STATE.personhood.events = clone(runtimePersonhood.events || STATE.personhood.events || []);
	      STATE.personhood.microReactions = clone(runtimePersonhood.microReactions || STATE.personhood.microReactions || []);
	      STATE.personhood.presence = clone(runtimePersonhood.presence || STATE.personhood.presence || {});
	      STATE.personhood.roomIntelligenceV0 = clone(runtimeRoom.roomIntelligenceV0 || STATE.personhood.roomIntelligenceV0 || null);
	      STATE.personhood.silence = clone(runtimePersonhood.silence || STATE.personhood.silence || []);
	      STATE.personhood.config = Object.assign({}, STATE.personhood.config || {}, clone(runtimePersonhood.config || {}));
	      const roomFeed = normalizeThreadMessages(pulseState.threadMessages)
	        .filter(item => String(item?.speakerId || '').toLowerCase() !== 'user')
	        .slice(-24)
	        .map(item => ({
	          id: String(item?.id || ''),
	          who: String(item?.speakerId || ''),
	          kind: String(item?.kind || 'message'),
	          tone: String(item?.tone || ''),
	          text: visibleThreadText(item),
	          threadId: String(pulseState.activeThreadId || ''),
	          createdAt: String(item?.createdAt || '')
	        }))
	        .filter(item => item.text);
	      STATE.aiCommsCenter = STATE.aiCommsCenter || {};
	      STATE.aiCommsCenter.feed = roomFeed;
	      STATE.aiCommsCenter.roomTone = roomFeed.slice(-10).map(item => ({
	        id: item.who,
	        who: item.who,
	        tone: item.tone,
	        kind: item.kind,
	        text: item.text
	      }));
	      STATE.aiCommsCenter.target = sanitizePulseTarget(
	        pulseState.lastResponse?.threadMeta?.lastTargetedSpeaker
	        || runtimeRoom.conversationContract?.lastTargetedSpeaker
	        || STATE.aiCommsCenter.target
	        || 'studio'
	      );
	      delete STATE.aiCommsCenter.activeThreadId;
	      STATE.aiCommsCenter.roomMode = String(runtimeRoom.conversationContract?.rhythmState?.pace || STATE.aiCommsCenter.roomMode || 'balanced');
	      STATE.aiCommsCenter.lastDecisionTrace = clone(runtimeRoom.decisionTrace || STATE.aiCommsCenter.lastDecisionTrace || null);
	      const latestSpark = [...roomFeed].reverse().find(item => item.kind === 'spark');
	      STATE.aiCommsCenter.lastAmbientAt = latestSpark ? (Date.parse(String(latestSpark.createdAt || '')) || Date.now()) : Number(STATE.aiCommsCenter.lastAmbientAt || 0);
	      STATE.aiCommsCenter.ambientEnabled = true;
	      Object.entries(pulseState.homes || {}).forEach(([id, profile]) => {
        const p = profile || {};
        const home = p.home || {};
        STATE.pulseHomes[id] = JSON.parse(JSON.stringify(p));
        const firstInterior = home.livingRoom || home.workspace || home.bedroom || home.kitchen || home.bathroom || '';
        STATE.homeProfiles[id] = Object.assign({}, STATE.homeProfiles[id] || {}, {
          usageRule: (STATE.homeProfiles[id] || {}).usageRule || p.usageRule || '',
          continuityNotes: (STATE.homeProfiles[id] || {}).continuityNotes || p.notes || ''
        });
        if (firstInterior || home.exterior) {
          STATE.homeAssets[id] = Object.assign({}, STATE.homeAssets[id] || {}, {
            room: (STATE.homeAssets[id] || {}).room || firstInterior || '',
            yard: (STATE.homeAssets[id] || {}).yard || home.exterior || ''
          });
        }
        if (home.exterior || p.items?.car || p.notes) {
          STATE.teamRecords[id] = STATE.teamRecords[id] || {};
        }
      });
    }catch(e){}
  }
	  function flushPulseGlobalState(){
    pulseRuntime.globalSaveTimer = null;
    bridgePulseHomesIntoState();
    try{ window.saveState && window.saveState({ reason:'studio_pulse_save' }); }catch(e){}
  }
	  function queuePulseGlobalState(){
    if (pulseRuntime.globalSaveTimer) clearTimeout(pulseRuntime.globalSaveTimer);
    pulseRuntime.globalSaveTimer = setTimeout(flushPulseGlobalState, 140);
  }
	  function savePulse(options){
    const opts = options && typeof options === 'object' ? options : {};
    try { localStorage.setItem(STORE_KEY, JSON.stringify(pulseState)); } catch(e){}
    if (opts.bridge !== false) bridgePulseHomesIntoState();
    if (opts.global !== false) {
      queuePulseGlobalState();
    }
  }
	  function currentVersion(){ return window.getSilvaVersion ? window.getSilvaVersion() : 'v3.9.9'; }

	  function applyRoomRuntimePayload(payload){
	    const runtimeRoom = payload?.roomRuntime;
	    if (!runtimeRoom || typeof runtimeRoom !== 'object') return;
	    const runtimeThreadId = normalizeThreadIdLike(payload?.thread?.id || pulseState.activeThreadId || '');
	    if (runtimeThreadId) pulseState.activeThreadId = runtimeThreadId;
	    if (payload?.thread?.title) pulseState.activeThreadTitle = String(payload.thread.title || pulseState.activeThreadTitle || '');
	    if (payload?.thread?.status) pulseState.activeThreadStatus = String(payload.thread.status || pulseState.activeThreadStatus || 'active');
	    pulseState.roomRuntime = clone(runtimeRoom);
	    bridgePulseHomesIntoState();
	  }

  function ensureState(){
    window.STATE = window.STATE || {};
    STATE.consistencyLab = STATE.consistencyLab || pulseState.homes || {};
    STATE.assetHints = STATE.assetHints || pulseState.assetHints || {};
  }

  function patchChrome(){
    const homeNav = document.querySelector('.nav-item[data-page="home"]');
    if (homeNav) homeNav.innerHTML = '<span class="nav-icon">⬡</span>Studio Pulse';
    if (window.applySilvaChromeVersion) window.applySilvaChromeVersion();
  }

  function frontendArtifactMetrics(){
    const prompts = Array.isArray(window.STATE?.prompts) ? STATE.prompts : [];
    const gallery = Array.isArray(window.STATE?.gallery) ? STATE.gallery : [];
    const planner = Array.isArray(window.STATE?.plannerPosts) ? STATE.plannerPosts : [];
    const reviews = Array.isArray(window.STATE?.reviewEvents) ? STATE.reviewEvents : [];
    const pendingFollowUps = reviews.filter(item => {
      if (!item || typeof item !== 'object') return false;
      if (item.requiresFollowUp != null) return Boolean(item.requiresFollowUp);
      const overall = item.overall == null ? null : Number(item.overall);
      const drift = item.drift == null ? (item.driftLevel == null ? null : Number(item.driftLevel)) : Number(item.drift);
      if (Number.isFinite(overall) && overall <= 7) return true;
      if (Number.isFinite(drift) && drift >= 4) return true;
      return Boolean(item.fix_next || item.fixNext || item.followUpNote || item.issue);
    }).length;
    return {
      prompts: prompts.length,
      gallery: gallery.length,
      planner: planner.length,
      reviews: reviews.length,
      pendingFollowUps
    };
  }

  function quickPromptChips(){
    return [
      'What is blocked right now?',
      'What is drifting and why?',
      'What should we review before generating more?',
      'Which continuity anchors are still thin?',
      'What should happen next this week?'
    ];
  }

  function providerRowMarkup(entry, index){
    const item = normalizeProviderEntry(entry, index);
    return `<div class="sp-provider-row" data-sp-provider-row="${esc(item.id)}">
      <div class="sp-provider-field">
        <label>Label</label>
        <input data-provider-prop="label" value="${esc(item.label)}" placeholder="Google AI Pro">
      </div>
      <div class="sp-provider-field">
        <label>Model</label>
        <input data-provider-prop="model" value="${esc(item.model)}" placeholder="gemini-2.5-flash">
      </div>
      <div class="sp-provider-field">
        <label>API key</label>
        <input data-provider-prop="apiKey" value="${esc(item.apiKey)}" placeholder="Paste Gemini key">
      </div>
      <label class="sp-provider-toggle"><input type="checkbox" data-provider-prop="enabled"${item.enabled ? ' checked' : ''}>Active</label>
      <button class="sp-tool" type="button" data-provider-remove="${esc(item.id)}" title="Remove fallback key" aria-label="Remove fallback key">${iconMarkup('remove')}</button>
    </div>`;
  }
	  function providerPanelMarkup(){
    const cfg = loadProviderShell();
    const keys = cfg.pulseApiKeys || [];
    return `<div class="sp-compose-panel" id="sp-provider-panel">
      <div class="sp-compose-panel-head">
        <div><strong>Fallback API keys</strong><span>Studio Pulse tries these Gemini keys in order. If one account is rate-limited or down, the next live key gets a turn.</span></div>
      </div>
      <div class="sp-provider-summary">${keys.filter(item => item.enabled && item.apiKey).length} active fallback key${keys.filter(item => item.enabled && item.apiKey).length === 1 ? '' : 's'} ready. Your local \`.env\` key still remains the last-resort backend fallback if no stored key works.</div>
      <div class="sp-provider-list">${keys.length ? keys.map(providerRowMarkup).join('') : '<div class="sp-tool-hint">No fallback keys stored yet. Add one or more Gemini keys here and Studio Pulse will try them in order.</div>'}</div>
      <div class="sp-provider-actions">
        <button class="btn btn-ghost btn-sm" type="button" id="sp-provider-add">Add fallback key</button>
        <button class="btn btn-primary btn-sm" type="button" id="sp-provider-save">Save key order</button>
        <button class="btn btn-ghost btn-sm" type="button" id="sp-open-provider-settings">Open full provider shell</button>
      </div>
    </div>`;
  }
  function quickToolPanelMarkup(){
    return `<div class="sp-compose-panel" id="sp-quick-panel">
      <div class="sp-compose-panel-head">
        <div><strong>Quick tools</strong><span>Fast controls for mode switching, continuity routing, and room tuning without leaving the thread.</span></div>
      </div>
      <div class="sp-quick-tools">
        <button class="btn btn-ghost btn-sm" type="button" data-mode="direction">Direction</button>
        <button class="btn btn-ghost btn-sm" type="button" data-mode="consistency">Consistency</button>
        <button class="btn btn-ghost btn-sm" type="button" data-mode="prompt">Prompt fix</button>
        <button class="btn btn-ghost btn-sm" type="button" data-mode="assets">Asset gap</button>
        <button class="btn btn-ghost btn-sm" type="button" data-mode="content">Content plan</button>
      </div>
      <div class="sp-provider-actions">
        <button class="btn btn-ghost btn-sm" type="button" id="sp-tool-open-archive">Open archive</button>
        <button class="btn btn-ghost btn-sm" type="button" id="sp-tool-open-tuning">Character tuning</button>
        <button class="btn btn-ghost btn-sm" type="button" id="sp-tool-open-snapshot">Continuity snapshot</button>
      </div>
    </div>`;
  }
  function activeThreadAttachments(){
    return Array.isArray(pulseState.threadAttachments) ? pulseState.threadAttachments.map(normalizePulseAttachment).filter(Boolean) : [];
  }
	  function activeThreadWorkflows(){
	    return Array.isArray(pulseState.threadWorkflows) ? pulseState.threadWorkflows.map(normalizePulseWorkflow).filter(Boolean) : [];
	  }
	  function activeWorkflowDraft(){
	    const explicit = pulseState.activeWorkflowDraft ? normalizePulseWorkflow(pulseState.activeWorkflowDraft) : null;
	    if (explicit && !['committed','commit_failed'].includes(String(explicit.status || '').toLowerCase())) return explicit;
	    return activeThreadWorkflows().find(item => !['committed','commit_failed'].includes(String(item.status || '').toLowerCase())) || null;
	  }
		  function activeWorkflowCommitCard(workflowInput){
		    const workflow = workflowInput && typeof workflowInput === 'object' ? normalizePulseWorkflow(workflowInput) : activeWorkflowDraft();
		    if (!workflow || workflowClassOf(workflow) !== 'committable') return null;
		    const workflowCard = workflow?.commitCard ? normalizePulseCommitCard(workflow.commitCard) : null;
		    const next = workflowCard;
		    if (!next) return null;
		    if (workflow?.id && next.workflowId && next.workflowId !== workflow.id) return null;
		    if (!next.workflowId && workflow?.id) return Object.assign({}, next, { workflowId: workflow.id });
		    return next;
		  }
	  function activeWorkflowCommitDisplay(){
	    const workflow = activeWorkflowDraft();
	    const card = activeWorkflowCommitCard(workflow);
	    if (!workflow || !card) return null;
	    const key = workflowCommitDisplayKey(workflow);
	    const fingerprint = workflowCommitFingerprint(workflow, card);
	    const stored = commitCardUiState(key);
	    const displayMode = stored?.fingerprint === fingerprint && ['hidden','hint','expanded'].includes(String(stored?.display || ''))
	      ? String(stored.display)
	      : 'hidden';
	    return {
	      workflow,
	      card,
	      key,
	      fingerprint,
	      displayMode,
	      expanded: displayMode === 'expanded'
	    };
	  }
	  function setWorkflowCommitDisplay(display, options){
	    const state = activeWorkflowCommitDisplay();
	    if (!state?.key) return;
	    rememberCommitCardUiState(state.key, display || 'hint', state.fingerprint);
	    savePulse({ global:false });
	    if (options?.render) renderStudioPulseHome();
	  }
  function focusCommitSurface(){
    const target = byId('sp-confirm-commit') || byId('sp-stage-commit') || byId('sp-commit-open-details') || byId('sp-commit-card');
    if (target && typeof target.focus === 'function') {
      try { target.focus({ preventScroll:true }); } catch(e){ try { target.focus(); } catch(err){} }
    }
    if (target && typeof target.scrollIntoView === 'function') {
      try { target.scrollIntoView({ block:'nearest', behavior:'smooth' }); } catch(e){}
    }
  }
	  function revealWorkflowCommitCard(options){
	    const state = activeWorkflowCommitDisplay();
	    if (!state?.key) return false;
	    rememberCommitCardUiState(state.key, 'expanded', state.fingerprint);
	    savePulse({ global:false });
	    if (options?.render) {
	      renderStudioPulseHome();
      if (options?.focus) focusCommitSurface();
    }
    return true;
  }
  function attachmentRouteHint(item){
    const kind = String(item?.kind || '').toLowerCase();
    if (kind === 'image') return 'make';
    if (kind === 'text' || kind === 'pdf') return 'analyze';
    return 'plan';
  }
  function attachmentTrayMarkup(){
    const items = activeThreadAttachments();
    if (!items.length) return '';
    return `<div class="sp-attachment-tray">${items.map(item => `<div class="sp-attachment-chip"><strong>${esc(item.kind || 'file')}</strong><span>${esc(item.name || 'Attachment')}</span><em>${esc(item.source || attachmentRouteHint(item))}</em><button class="sp-attachment-remove" type="button" data-remove-attachment="${esc(item.id)}" aria-label="Remove attachment">${iconMarkup('remove')}</button></div>`).join('')}</div>`;
  }
  function workflowCommitStatusLine(card, workflow){
    const missingCount = Array.isArray(card?.missingFields) ? card.missingFields.filter(Boolean).length : 0;
    const committed = String(workflow?.status || '').toLowerCase() === 'committed';
    if (committed) return 'Committed into the live system.';
    if (card?.ready) return 'Ready to commit when you want it locked.';
    if (missingCount) return `${missingCount} field${missingCount === 1 ? '' : 's'} still missing before commit.`;
    return 'Commit details are staged and waiting for review.';
  }
  function workflowCommitHintMarkup(){
    return '';
  }
  function workflowCommitCardMarkup(){
    return '';
  }
  function mediaPanelWorkflowStatusMarkup(){
    return '';
  }
  function mediaActionPanelMarkup(){
    return `<div class="sp-compose-panel sp-workflow-panel" id="sp-media-panel">
      <div class="sp-compose-panel-head">
        <div><strong>Pulse actions</strong><span>Clean room rebuild mode is live. Room chat works now. Workflow and commit tools are paused for the rebuild.</span></div>
      </div>
      <div class="sp-workflow-actions">
        <button class="sp-workflow-action" type="button" data-pulse-action="upload-image"><div><strong>Upload image/photo</strong><span>Bring visual context into the room without starting a workflow.</span></div>${iconMarkup('plus')}</button>
        <button class="sp-workflow-action" type="button" data-pulse-action="upload-file"><div><strong>Upload file</strong><span>Bring in text, captions, PDFs, or notes as neutral room context.</span></div>${iconMarkup('plus')}</button>
      </div>
      <input class="sp-hidden-input" type="file" id="sp-upload-image" accept="image/*" multiple>
      <input class="sp-hidden-input" type="file" id="sp-upload-file" accept=".txt,.md,.markdown,.json,.csv,.tsv,.pdf,text/*,application/pdf" multiple>
    </div>`;
  }
  function launchComposerMarkup(){
    const showTools = pulseState.openPanels?.composerTools === true;
    const showProviders = pulseState.openPanels?.apiKeys === true;
    const showMedia = pulseState.openPanels?.mediaActions === true;
    const sparkBusy = pulseRuntime.sparkInFlight === true;
    const requestBusy = pulseRuntime.requestInFlight === true;
    return `<div class="sp-composer-shell">
      ${replyTargetBannerMarkup()}
      <textarea id="sp-input" class="field-textarea cc-ask" placeholder="Say what you need. Room chat is live. Workflow tools are paused during the rebuild.">${esc(composerDraftValue())}</textarea>
      ${attachmentTrayMarkup()}
      ${workflowCommitHintMarkup()}
      <div class="sp-composer-actions">
        <div class="sp-composer-tools">
          <button class="sp-tool sp-tool-label ${showTools ? 'is-active' : ''}" type="button" id="sp-tool-quick" title="Quick tools" aria-label="Quick tools">${iconMarkup('tools')}<span>Tools</span></button>
          <button class="sp-tool sp-tool-label ${showProviders ? 'is-active' : ''}" type="button" id="sp-tool-providers" title="Fallback API keys" aria-label="Fallback API keys">${iconMarkup('providers')}<span>Keys</span></button>
          <button class="sp-tool ${showMedia ? 'is-active' : ''}" type="button" id="sp-tool-media" title="Attachments and room actions" aria-label="Attachments and room actions">${iconMarkup('plus')}</button>
        </div>
        <div class="sp-send-row">
          <button class="sp-spark-trigger${sparkBusy ? ' is-busy' : ''}" type="button" id="sp-spark-trigger" title="Spark the room" aria-label="Spark the room" aria-busy="${sparkBusy ? 'true' : 'false'}">${iconMarkup('sparkTrigger')}</button>
          <button class="btn btn-primary" id="sp-send" ${requestBusy ? 'disabled aria-busy="true"' : ''}>${requestBusy ? 'Thinking…' : 'Ask Studio Pulse'}</button>
        </div>
      </div>
      ${workflowCommitCardMarkup()}
      ${(showTools || showProviders || showMedia) ? `<div class="sp-composer-inline-panels">${showTools ? quickToolPanelMarkup() : ''}${showProviders ? providerPanelMarkup() : ''}${showMedia ? mediaActionPanelMarkup() : ''}</div>` : ''}
    </div>`;
  }
  function collectPulseProviderRows(sourceCfg){
    const cfg = normalizeProviderConfig(sourceCfg || loadProviderShell());
    return Array.from(document.querySelectorAll('[data-sp-provider-row]')).map((row, index) => {
      const current = (cfg.pulseApiKeys || [])[index] || {};
      const get = (prop) => row.querySelector(`[data-provider-prop="${prop}"]`);
      return normalizeProviderEntry({
        id: row.getAttribute('data-sp-provider-row') || current.id,
        label: get('label')?.value || '',
        provider: current.provider || 'gemini',
        model: get('model')?.value || '',
        apiKey: get('apiKey')?.value || '',
        enabled: !!get('enabled')?.checked
      }, index);
    }).filter(item => item.apiKey || item.label || item.model);
  }
  function persistPulseProviderRows(opts){
    const options = opts || {};
    const cfg = loadProviderShell();
    cfg.pulseApiKeys = collectPulseProviderRows(cfg);
    saveProviderShell(cfg);
    if (options.notify && window.toast) {
      toast(`Saved ${cfg.pulseApiKeys.length} Studio Pulse fallback key${cfg.pulseApiKeys.length === 1 ? '' : 's'}`);
    }
    if (options.render) renderStudioPulseHome();
    return cfg;
  }
	  function queuePulseProviderAutosave(){
	    if (pulseRuntime.providerAutosaveTimer) clearTimeout(pulseRuntime.providerAutosaveTimer);
	    pulseRuntime.providerAutosaveTimer = setTimeout(() => {
	      pulseRuntime.providerAutosaveTimer = null;
	      try { persistPulseProviderRows({ render:false, notify:false }); } catch(e){}
	    }, 260);
	  }
	  function buildCharacterBehaviorTreePayload(){
	    const out = {};
	    Object.keys(CHARACTER_TUNING_DEFAULTS).forEach(id => {
	      const tuning = pulseState.characterTuning?.[id] || CHARACTER_TUNING_DEFAULTS[id] || {};
	      const tree = tuning.behaviorTree || {};
	      out[id] = {
	        identity: {
	          displayName: characterLabel(id),
	          roleTitle: CHARS[id]?.role || '',
	          oneLineEssence: tuning.corePersonality || '',
	          coreDrive: tuning.strengths || '',
	          publicMask: tuning.speakingStyle || '',
	          privateContradiction: tuning.relationshipNotes || ''
	        },
	        voice: {
	          firstPersonStyle: tuning.speakingStyle || '',
	          warmthLevel: Number(tuning.warmth || 0),
	          humourLevel: Number(tuning.humour || 0),
	          directnessLevel: Number(tuning.directness || 0),
	          playfulnessLevel: Number(tuning.playfulness || 0),
	          favoritePhrases: tree.randomSpark || '',
	          forbiddenPhrases: tuning.never || ''
	        },
	        behavior: {
	          defaultPosture: tree.identityRole || '',
	          decisionStyle: tree.usefulnessRule || '',
	          conflictStyle: tree.conflictTriggers || '',
	          supportStyle: tree.alliances || '',
	          curiosityStyle: tree.randomSpark || '',
	          impatienceStyle: tree.pressureResponse || ''
	        },
	        interests: {
	          workObsessions: tuning.strengths || '',
	          thingsThatAnnoyThem: tuning.petPeeves || '',
	          randomThoughtTopics: tree.randomSpark || '',
	          thingsTheyNotice: tree.delightTriggers || ''
	        },
	        utility: {
	          strongestUseCases: tuning.strengths || '',
	          boundaries: tuning.boundaries || '',
	          whatTheyShouldChallenge: tree.usefulnessRule || ''
	        },
	        relationships: {
	          summary: tuning.relationshipNotes || '',
	          alliances: tree.alliances || '',
	          rivalries: tree.rivalries || ''
	        },
	        mood: {
	          currentMood: (((window.STATE || {}).currentModes || {})[id]) || '',
	          confidence: Number(tuning.assertiveness || 0),
	          playfulness: Number(tuning.playfulness || 0),
	          patience: Number(100 - Number(tuning.conflictTolerance || 0))
	        },
	        boundaries: {
	          neverDo: tuning.never || '',
	          safetyStyle: tuning.boundaries || '',
	          dignityRules: tuning.boundaries || ''
	        },
	        evolution: {
	          recentGrowth: tuning.relationshipNotes || '',
	          memoryHooks: tree.privateAgenda || '',
	          unresolvedContradictions: tree.conflictTriggers || ''
	        }
	      };
	    });
	    return out;
	  }
	  function buildCouncilBehaviorPayload(){
	    const tuning = pulseState.councilTuning || {};
	    const disagreement = Number(tuning.disagreementLevel || 34);
	    const banter = Number(tuning.banterLevel || 32);
	    return {
	      groupChatMode: 'adaptive_room',
	      autonomyMode: banter >= 46 ? 'lively' : 'reactive_light_sparks',
	      conflictStyle: disagreement >= 56 ? 'messier_and_spicier' : disagreement >= 38 ? 'stylish_and_sharp' : 'mostly_polished',
	      democracyLevel: Number(tuning.democracyLevel || 62),
	      aishaOverrideStrength: Number(tuning.aishaOverrideStrength || 88),
	      disagreementFrequency: Number(tuning.disagreementLevel || 34),
	      banterFrequency: Number(tuning.banterLevel || 32),
	      spontaneousThoughtFrequency: Math.max(12, Math.min(68, Math.round((banter * 0.75) + 6))),
	      memoryInfluence: Number(tuning.memoryInfluence || 58),
	      archiveInfluence: Number(tuning.archivedChatInfluence || 44),
	      relationshipInfluence: 58,
	      userFamiliarity: 64,
	      silenceAllowed: 42,
	      maxSpeakersPerTurn: 3,
	      thinkingDelayRange: [620, 1450],
	      messageDelayRange: [720, 1680],
	      usefulnessFloor: 72,
	      dramaLimit: 58
	    };
	  }
	  function buildLiveStatePayload(){
	    const existing = (((window.STATE || {}).personhood || {}).liveState) || {};
	    const currentModes = ((window.STATE || {}).currentModes) || {};
	    const out = {};
	    Object.keys(CHARACTER_TUNING_DEFAULTS).forEach(id => {
	      const tuning = pulseState.characterTuning?.[id] || CHARACTER_TUNING_DEFAULTS[id] || {};
	      const live = existing[id] && typeof existing[id] === 'object' ? existing[id] : {};
	      const currentMood = String(live.currentMood || currentModes[id] || (tuning.playfulness >= 55 ? 'bright' : tuning.directness >= 78 ? 'sharp' : 'ready'));
	      out[id] = {
	        currentMood,
	        socialBattery: Number.isFinite(Number(live.socialBattery)) ? Number(live.socialBattery) : Math.max(0, Math.min(1, (Number(tuning.warmth || 50) + Number(tuning.playfulness || 40)) / 180)),
	        boredom: Number.isFinite(Number(live.boredom)) ? Number(live.boredom) : Math.max(0, Math.min(1, (100 - Number(tuning.detailLevel || 60)) / 140)),
	        irritation: Number.isFinite(Number(live.irritation)) ? Number(live.irritation) : Math.max(0, Math.min(1, Number(tuning.strictness || 50) / 180)),
	        curiosity: Number.isFinite(Number(live.curiosity)) ? Number(live.curiosity) : Math.max(0, Math.min(1, (Number(tuning.creativeRisk || 50) + Number(tuning.humour || 30)) / 180)),
	        playfulness: Number.isFinite(Number(live.playfulness)) ? Number(live.playfulness) : Math.max(0, Math.min(1, Number(tuning.playfulness || 40) / 100)),
	        confidence: Number.isFinite(Number(live.confidence)) ? Number(live.confidence) : Math.max(0, Math.min(1, Number(tuning.assertiveness || 60) / 100)),
	        patience: Number.isFinite(Number(live.patience)) ? Number(live.patience) : Math.max(0, Math.min(1, (100 - Number(tuning.conflictTolerance || 50)) / 100)),
	        stress: Number.isFinite(Number(live.stress)) ? Number(live.stress) : Math.max(0, Math.min(1, (Number(tuning.strictness || 50) + Number(tuning.detailLevel || 60) - Number(tuning.playfulness || 35)) / 240)),
	        resentment: Number.isFinite(Number(live.resentment)) ? Number(live.resentment) : Math.max(0, Math.min(1, (Number(tuning.conflictTolerance || 40) + Number(tuning.strictness || 50)) / 220)),
	        urgeToInterrupt: Number.isFinite(Number(live.urgeToInterrupt)) ? Number(live.urgeToInterrupt) : Math.max(0, Math.min(1, (Number(tuning.directness || 60) + Number(tuning.playfulness || 40)) / 220)),
	        urgeToDefend: Number.isFinite(Number(live.urgeToDefend)) ? Number(live.urgeToDefend) : Math.max(0, Math.min(1, (Number(tuning.warmth || 50) + Number(tuning.strictness || 50)) / 220)),
	        urgeToTease: Number.isFinite(Number(live.urgeToTease)) ? Number(live.urgeToTease) : Math.max(0, Math.min(1, (Number(tuning.humour || 30) + Number(tuning.playfulness || 40)) / 180)),
	        urgeToWithdraw: Number.isFinite(Number(live.urgeToWithdraw)) ? Number(live.urgeToWithdraw) : Math.max(0, Math.min(1, (100 - Number(tuning.warmth || 50) + Number(tuning.strictness || 50)) / 220)),
	        needToBeSeen: Number.isFinite(Number(live.needToBeSeen)) ? Number(live.needToBeSeen) : Math.max(0, Math.min(1, Number(tuning.assertiveness || 60) / 180)),
	        hungerForControl: Number.isFinite(Number(live.hungerForControl)) ? Number(live.hungerForControl) : Math.max(0, Math.min(1, Number(tuning.strictness || 60) / 150)),
	        attentionTarget: sanitizePulseTarget(live.attentionTarget || window.STATE?.aiCommsCenter?.target || 'studio'),
	        unresolvedUrge: String(live.unresolvedUrge || tuning.petPeeves || ''),
	        socialRole: CHARS[id]?.role || ''
	      };
	    });
	    return out;
	  }

	  function responseCard(label, body){
	    return `<div class="sp-response-card"><span class="label">${esc(label)}</span><div class="body">${body || '—'}</div></div>`;
	  }

	  function normalizePulseResponse(resp){
	    const src = resp && typeof resp === 'object' ? resp : {};
	    const lead = src.departmentLead || (src.lead && src.lead !== 'studio' ? src.lead : '') || src.supportingLead || 'aisha';
	    const notes = Array.isArray(src.councilNotes) ? src.councilNotes : (src.supportingLead && src.supportingPerspective ? [{ speaker: src.supportingLead, text: src.supportingPerspective, stance: 'support' }] : []);
	    const tension = Array.isArray(src.teamTension) ? src.teamTension : (src.teamTension ? [{ from:'aisha', to:lead, text:String(src.teamTension) }] : []);
	    const participants = new Set(Array.isArray(src.participants) ? src.participants : ['aisha', lead]);
	    notes.forEach(item => { if (item?.speaker) participants.add(item.speaker); });
	    tension.forEach(item => { if (item?.from) participants.add(item.from); if (item?.to) participants.add(item.to); });
	    return Object.assign({}, src, {
	      chair: 'aisha',
	      departmentLead: lead,
	      departmentPerspective: textValue(src.departmentPerspective || src.leadPerspective || src.summary || ''),
	      aishaFrame: textValue(src.aishaFrame || ''),
	      councilNotes: notes.map(item => item && typeof item === 'object' ? Object.assign({}, item, { text:textValue(item.text || item.note || item.perspective || item) }) : item).filter(item => item && item.text),
	      teamTension: tension.map(item => item && typeof item === 'object' ? Object.assign({}, item, { text:textValue(item.text || item.note || item.issue || item) }) : item).filter(item => item && item.text),
	      aishaFinal: textValue(src.aishaFinal || src.summary || src.departmentPerspective || src.leadPerspective || ''),
	      actions: (Array.isArray(src.actions) ? src.actions : []).map(textValue).filter(Boolean),
	      consistencyChecks: (Array.isArray(src.consistencyChecks) ? src.consistencyChecks : []).map(textValue).filter(Boolean),
	      suggestedAssets: (Array.isArray(src.suggestedAssets) ? src.suggestedAssets : []).map(textValue).filter(Boolean),
	      promptIdeas: (Array.isArray(src.promptIdeas) ? src.promptIdeas : []).map(textValue).filter(Boolean),
	      relationshipDeltas: Array.isArray(src.relationshipDeltas) ? src.relationshipDeltas : [],
	      participants: [...participants].filter(Boolean)
	    });
	  }
	  function responsePattern(resp){
	    return String(resp?.threadMeta?.responsePattern || resp?.meta?.responsePattern || '').trim().toLowerCase();
	  }
	  function hasRenderableMessageEvents(resp){
	    const events = Array.isArray(resp?.messageEvents) ? resp.messageEvents : [];
	    return events.some(item => item && item.visible !== false && item.kind !== 'thinking' && textValue(item.text || ''));
	  }
	  function isLightRoomTurn(resp){
	    const pattern = responsePattern(resp);
	    if (['banter','quiet-room'].includes(pattern)) return true;
	    const events = Array.isArray(resp?.messageEvents) ? resp.messageEvents.filter(item => item && item.visible !== false && item.kind !== 'thinking' && textValue(item.text || '')) : [];
	    if (!events.length) return false;
	    const hasRoomNotes = Boolean((resp?.actions || []).length || (resp?.consistencyChecks || []).length || (resp?.suggestedAssets || []).length || (resp?.promptIdeas || []).length || (resp?.relationshipDeltas || []).length);
	    return !hasRoomNotes && events.length <= 4;
	  }
	  function sameAsActiveQuestion(title){
	    const a = String(title || '').trim().toLowerCase();
	    const b = String(pulseRuntime.activeQuestion || '').trim().toLowerCase();
	    if (!a || !b) return false;
	    return a === b;
	  }
	  function shouldShowResponseTitle(resp){
	    if (hasRenderableMessageEvents(resp)) return false;
	    const title = String(resp?.title || '').trim();
	    if (!title) return false;
	    if (/^(studio|council)\s+response$/i.test(title)) return false;
	    if (sameAsActiveQuestion(title)) return false;
	    return !isLightRoomTurn(resp);
	  }
	  function shouldShowResponseSummary(resp){
	    if (hasRenderableMessageEvents(resp)) return false;
	    const summary = textValue(resp?.summary || '');
	    if (!summary) return false;
	    return !isLightRoomTurn(resp);
	  }
	  function shouldShowResponseMeta(resp){
	    if (hasRenderableMessageEvents(resp)) return false;
	    const pattern = responsePattern(resp);
	    return !isLightRoomTurn(resp) && pattern !== 'quiet-room';
	  }
	  function isCasualThreadTitle(raw){
	    const title = String(raw || '').trim().toLowerCase();
	    if (!title) return false;
	    return /^(hi|hello|hey|yo|sup|hiya|hi team|who('?s| is) hungry|who is online|lol\b|hmm\b|okay\b|ok\b)/.test(title);
	  }
	  function shouldDetachCurrentTurn(){
	    return pulseRuntime.isSequencing || Array.isArray(pulseRuntime.pendingThreadMessages);
	  }

	  function characterLabel(id){ return CHARS[id]?.label || id || 'Studio'; }
	  function characterColor(id){ return CHARS[id]?.color || 'var(--aisha)'; }
	  function roomIntelligenceRuntime(){
	    const runtime = pulseState.roomRuntime && typeof pulseState.roomRuntime === 'object' ? pulseState.roomRuntime : {};
	    const room = runtime.roomIntelligenceV0 && typeof runtime.roomIntelligenceV0 === 'object' ? runtime.roomIntelligenceV0 : null;
	    if (room) return room;
	    return {
	      roomMood:'steady',
	      lastSpeakerId:'',
	      knownPresenceStatus:{ aisha:'active', vanya:'active', leah:'quiet', claudia:'quiet', grok:'quiet' },
	      activeCharacterIds:['aisha','vanya'],
	      inactiveCharacterIds:[],
	      characterStates:{}
	    };
	  }
	  function roomPresenceLabel(ids){
	    const list = (Array.isArray(ids) ? ids : []).filter(id => CHARS[id]).map(characterLabel);
	    if (!list.length) return 'none';
	    if (list.length === 1) return list[0];
	    if (list.length === 2) return `${list[0]} + ${list[1]}`;
	    return `${list.slice(0,2).join(' + ')} +${list.length - 2}`;
	  }
	  function pulseEngineStatus(){
	    const meta = pulseState.lastMeta && typeof pulseState.lastMeta === 'object' ? pulseState.lastMeta : {};
	    const active = String(meta.activeEngine || 'local-room-intelligence').trim();
	    const aishaConnected = meta.aishaEngineConnected === true;
	    return {
	      activeLabel: active === 'aisha' ? 'A.I.S.H.A' : 'Local Room Intelligence',
	      aishaLabel: aishaConnected ? 'Connected' : 'Not connected'
	    };
	  }
	  function roomPresenceStripMarkup(){
	    const room = roomIntelligenceRuntime();
	    const engine = pulseEngineStatus();
	    const status = room.knownPresenceStatus || {};
	    const active = Object.keys(status).filter(id => status[id] === 'active');
	    const quiet = Object.keys(status).filter(id => status[id] === 'quiet');
	    const away = Object.keys(status).filter(id => status[id] === 'away');
	    const unknown = Object.keys(status).filter(id => status[id] === 'unknown');
	    const speaker = CHARS[room.lastSpeakerId] ? room.lastSpeakerId : '';
	    const chips = [
	      `<span class="sp-room-presence-chip"><i class="sp-room-dot is-active"></i><strong>Present</strong>${esc(roomPresenceLabel(active))}</span>`,
	      `<span class="sp-room-presence-chip"><i class="sp-room-dot is-quiet"></i><strong>Quiet</strong>${esc(roomPresenceLabel(quiet))}</span>`,
	      away.length ? `<span class="sp-room-presence-chip"><i class="sp-room-dot is-away"></i><strong>Away</strong>${esc(roomPresenceLabel(away))}</span>` : '',
	      unknown.length ? `<span class="sp-room-presence-chip"><i class="sp-room-dot is-unknown"></i><strong>Unknown</strong>${esc(roomPresenceLabel(unknown))}</span>` : '',
	      speaker ? `<span class="sp-room-presence-chip"><strong>Current speaker</strong>${esc(characterLabel(speaker))}</span>` : '',
	      `<span class="sp-room-presence-chip"><strong>Mood</strong>${esc(String(room.roomMood || 'steady'))}</span>`,
	      `<span class="sp-room-presence-chip is-engine"><strong>Active Engine</strong>${esc(engine.activeLabel)}</span>`,
	      `<span class="sp-room-presence-chip is-engine"><strong>A.I.S.H.A</strong>${esc(engine.aishaLabel)}</span>`
	    ].filter(Boolean).join('');
	    return `<div class="sp-room-presence" id="sp-room-presence" aria-label="Studio Pulse room presence">${chips}</div>`;
	  }
	  function roomMessageMetaMarkup(meta){
	    const bits = [];
	    const presence = String(meta?.presence || '').trim();
	    const intent = String(meta?.roomIntent || meta?.responseIntent || '').trim();
	    const emotional = String(meta?.emotionalState || '').trim();
	    const humanPresence = humanRoomChipLabel(presence, 'presence');
	    const humanIntent = humanRoomChipLabel(intent, 'intent');
	    const humanEmotional = humanRoomChipLabel(emotional, 'mood');
	    if (humanPresence) bits.push(`<span>${esc(humanPresence)}</span>`);
	    if (humanIntent) bits.push(`<span>${esc(humanIntent)}</span>`);
	    if (humanEmotional && humanEmotional !== humanIntent) bits.push(`<span>${esc(humanEmotional)}</span>`);
	    return bits.length ? `<div class="sp-room-msg-meta">${bits.join('')}</div>` : '';
	  }
	  function humanRoomChipLabel(value, kind){
	    const raw = String(value || '').trim();
	    if (!raw) return '';
	    const key = raw.toLowerCase().replace(/[_\s]+/g, '-');
	    if (kind === 'presence') {
	      if (key === 'active') return 'Present';
	      if (key === 'quiet') return 'Quiet';
	      if (key === 'away') return 'Away';
	      if (key === 'unknown') return 'Unknown';
	    }
	    const map = {
	      'greeting': 'Warm',
	      'wellbeing-check': 'Playful',
	      'presence-summary': 'Listening',
	      'direct-acknowledgement': 'Leaning in',
	      'host-presence-explain': 'Listening',
	      'honest-opinion': 'Candid',
	      'boundary': 'Guarded',
	      'de-escalate': 'Warm',
	      'diagnose': 'Diagnostic',
	      'memory-candidate': 'Focused',
	      'campaign-plan': 'Focused',
	      'room-answer': 'Listening',
	      'direct-answer': 'Leaning in',
	      'message': 'Listening',
	      'warm': 'Warm',
	      'sharp': 'Sharp',
	      'focused': 'Focused',
	      'firm': 'Guarded',
	      'dry': 'Sharp',
	      'playful': 'Playful',
	      'warm-boundary': 'Guarded',
	      'composed': 'Focused',
	      'diagnostic': 'Diagnostic',
	      'precise': 'Focused'
	    };
	    return map[key] || '';
	  }
	  function voiceCard(id, label, text, extraClass, meta){
	    const speakerId = CHARS[id] ? id : 'studio';
	    return `<div class="sp-voice-card ${extraClass || ''}" style="--speaker-color:${esc(characterColor(speakerId))}"><div class="who"><span>${esc(label || characterLabel(speakerId))}</span></div><div class="say">${esc(text || '—')}</div>${roomMessageMetaMarkup(meta)}</div>`;
	  }
	  function accordion(key, title, summary, body){
	    const open = pulseState.openPanels?.[key] === true;
	    return `<div class="sp-accordion ${open ? 'is-open' : ''}" data-panel="${esc(key)}">
	      <button class="sp-accordion-toggle" type="button" data-panel-toggle="${esc(key)}"><span class="sp-accordion-title"><span>${esc(title)}</span><span>${esc(summary)}</span></span><span class="sp-accordion-caret">${open ? '−' : '+'}</span></button>
	    </div>`;
	  }
	  function drawerPanel(key, body){
	    const open = pulseState.openPanels?.[key] === true;
	    return `<div class="sp-drawer-panel ${open ? 'is-open' : ''}" data-drawer="${esc(key)}">${body}</div>`;
	  }
	  function tuningSliderMarkup(id, key, label, value){
	    return `<div class="sp-tuning-row"><label>${esc(label)}</label><output id="sp-out-${esc(id)}-${esc(key)}">${esc(value)}</output><input type="range" min="0" max="100" value="${esc(value)}" data-tuning-range="${esc(id)}:${esc(key)}"></div>`;
	  }
	  function characterTuningMarkup(){
	    const id = pulseState.selectedTuningChar || 'aisha';
	    const tuning = pulseState.characterTuning[id] || CHARACTER_TUNING_DEFAULTS[id];
	    const options = Object.keys(CHARACTER_TUNING_DEFAULTS).map(charId => `<option value="${esc(charId)}"${charId===id?' selected':''}>${esc(characterLabel(charId))}</option>`).join('');
	    const sliders = TUNING_FIELDS.map(([key,label]) => tuningSliderMarkup(id, key, label, tuning[key])).join('');
	    const textFields = [
	      ['corePersonality','Core personality'], ['speakingStyle','Speaking style'], ['strengths','Strengths'], ['boundaries','Boundaries'], ['petPeeves','Pet peeves'], ['relationshipNotes','Relationship notes'], ['never','Never say / do']
	    ].map(([key,label]) => `<label class="sp-tuning-textarea"><span class="cc-sub">${esc(label)}</span><textarea data-tuning-text="${esc(id)}:${esc(key)}">${esc(tuning[key] || '')}</textarea></label>`).join('');
	    const council = pulseState.councilTuning || {};
	    const councilSliders = [
	      ['democracyLevel','Democracy'], ['aishaOverrideStrength','Aisha override'], ['disagreementLevel','Disagreement'], ['banterLevel','Banter'], ['memoryInfluence','Memory'], ['archivedChatInfluence','Archive']
	    ].map(([key,label]) => tuningSliderMarkup('council', key, label, council[key])).join('');
	    const tree = tuning.behaviorTree || {};
	    const treeMarkup = TREE_GROUPS.map(([title, fields]) => `<div class="sp-tree-group"><div class="sp-tree-title">${esc(title)}</div>${fields.map(([key, label]) => `<label class="sp-tuning-textarea"><span class="cc-sub">${esc(label)}</span><textarea data-tuning-tree="${esc(id)}:${esc(key)}">${esc(tree[key] || '')}</textarea></label>`).join('')}</div>`).join('');
	    return `<select class="filter-select sp-tuning-select" id="sp-tuning-char">${options}</select><div class="sp-tuning-grid">${sliders}</div><div class="sp-tuning-text">${textFields}</div><div class="cc-sub" style="margin-top:14px">Behaviour tree</div><div class="sp-tree-grid">${treeMarkup}</div><div class="cc-sub" style="margin-top:14px">Room controls</div><div class="sp-tuning-grid">${councilSliders}</div>`;
	  }
	  function relationshipSummaryMarkup(){
	    const rows = Object.entries(pulseState.relationships || {}).slice(0, 8);
	    if (!rows.length) return '<div class="sp-side-item"><strong>Relationship model</strong><br>No saved relationship movement yet. The room will start evolving after Studio Pulse turns.</div>';
	    return rows.map(([key, rel]) => `<div class="sp-side-item"><strong>${esc(key.replace('__',' + '))}</strong><br>respect ${Math.round(Number(rel.respect || .6)*100)} · warmth ${Math.round(Number(rel.warmth || .45)*100)} · friction ${Math.round(Number(rel.friction || .18)*100)}<br>${esc(rel.recentTensionTopic || '')}</div>`).join('');
	  }

	  function studioHomeMarkup(){
	    const resp = pulseState.lastResponse ? normalizePulseResponse(pulseState.lastResponse) : null;
	    const threadMessages = normalizeThreadMessages(pulseState.threadMessages);
	    const liveResp = shouldDetachCurrentTurn() ? resp : null;
	    const hasThread = !!liveResp || threadMessages.length > 0;
	    const showThinking = pulseState.showThinking === true;
	    const counts = consistencyCounts();
	    const metrics = frontendArtifactMetrics();
	    const continuityProfiles = Object.keys(window.STATE?.homeProfiles || {}).length || Object.keys(pulseState.homes || {}).length;
	    const continuityAssetSets = Math.max(counts.home > 0 ? 1 : 0, Object.values(window.STATE?.homeAssets || {}).filter(item => item && typeof item === 'object' && Object.keys(item).some(key => item[key])).length);
	    const relCount = Object.keys(pulseState.relationships || {}).length;
	    const detachCurrentTurn = shouldDetachCurrentTurn();
	    const responseMetaBits = [];
	    if (pulseState.activeThreadStatus === 'saved') responseMetaBits.push('saved thread');
	    else if (pulseState.activeThreadStatus === 'archived') responseMetaBits.push('archived thread');
	    if (pulseState.activeThreadIncludeInContext === false) responseMetaBits.push('excluded from context');
	    if (pulseState.lastMeta?.resolvedFromHistory) responseMetaBits.push('continuing thread');
	    const responseMeta = esc(responseMetaBits.join(' · '));
	    const showNotesToggle = liveResp && !isLightRoomTurn(liveResp) && Boolean((liveResp?.actions || []).length || (liveResp?.consistencyChecks || []).length || (liveResp?.suggestedAssets || []).length || (liveResp?.promptIdeas || []).length || (liveResp?.relationshipDeltas || []).length);
	    const shellThreadTitle = (() => {
	      const raw = String(pulseState.activeThreadTitle || '').trim();
	      if (!raw) return 'Open room';
	      if (isCasualThreadTitle(raw)) return 'Open room';
	      if (sameAsActiveQuestion(raw)) return 'Open room';
	      if (liveResp && isLightRoomTurn(liveResp) && raw.length > 28) return 'Open room';
	      if (raw.length > 72) return `${raw.slice(0, 69).trim()}...`;
	      return raw;
	    })();
	    const infoBody = `<div class="cc-copy" style="margin:0 0 14px 0">Clean room rebuild mode is active. Room chat is live. Workflow and commit tools are intentionally paused while we rebuild the engine cleanly.</div><div class="cc-chip-row"><span class="cc-chip">${currentVersion()}</span><span class="cc-chip">Living room</span><span class="cc-chip">Rebuild mode</span></div><div class="sp-metric-grid"><div class="sp-metric"><strong>${metrics.prompts}</strong><span>Prompts</span></div><div class="sp-metric"><strong>${metrics.gallery}</strong><span>Gallery outputs</span></div><div class="sp-metric"><strong>${metrics.planner}</strong><span>Planner items</span></div><div class="sp-metric"><strong>${metrics.pendingFollowUps}</strong><span>Review pressure</span></div></div>`;
	    const modesBody = `<div class="cc-quickasks"><button data-mode="direction">Direction</button><button data-mode="consistency">Consistency</button><button data-mode="prompt">Prompt fix</button><button data-mode="assets">Asset gap check</button><button data-mode="content">Content planning</button></div><div class="small-note" style="margin-top:10px;color:var(--muted2);font-size:var(--type-xs);line-height:var(--leading-normal)">Current mode: <strong>${esc(pulseState.mode)}</strong></div>`;
	    const snapshotBody = `<div class="sp-side-list"><div class="sp-side-item"><strong>Continuity profiles</strong><br>${continuityProfiles} profile lane${continuityProfiles===1?'':'s'} mirrored into the live shell.</div><div class="sp-side-item"><strong>Home / asset coverage</strong><br>Home refs: ${counts.home} · outfits: ${counts.outfits} · items: ${counts.items} · vehicles: ${counts.vehicles} · legacy asset sets: ${continuityAssetSets}</div><div class="sp-side-item"><strong>Relationships</strong><br>${relCount} active relationship pair${relCount===1?'':'s'}.</div>${relationshipSummaryMarkup()}</div><div class="sp-rail-actions"><button class="btn btn-ghost btn-sm" id="sp-open-homes">Home</button><button class="btn btn-ghost btn-sm" id="sp-open-assets">Assets</button><button class="btn btn-ghost btn-sm" id="sp-open-gallery">Gallery</button><button class="btn btn-ghost btn-sm" id="sp-open-planner">Planner</button></div>`;
	    const savedChats = (pulseState.savedChats || []).slice(0,8);
	    const archiveThreads = (pulseState.archiveThreads || []).slice(0,18);
	    const archiveBody = `${savedChats.length ? `<div class="cc-sub" style="margin-bottom:8px">Saved notes</div><div class="sp-history-list" style="margin-bottom:14px">${savedChats.map(item => item.threadId ? `<button type="button" class="sp-history-item is-saved${item.threadId === pulseState.activeThreadId ? ' is-active' : ''}" data-open-thread="${esc(item.threadId)}"><span class="m">saved · ${esc(item.mode)} · ${esc(item.ts || '')}</span>${esc(item.title || item.q)}${item.summary ? `<br><span style="color:var(--muted2)">${esc(item.summary)}</span>` : ''}</button>` : `<div class="sp-history-item is-saved"><span class="m">saved · ${esc(item.mode)} · ${esc(item.ts || '')}</span>${esc(item.title || item.q)}${item.summary ? `<br><span style="color:var(--muted2)">${esc(item.summary)}</span>` : ''}</div>`).join('')}</div>` : ''}<div class="cc-sub" style="margin-bottom:8px">Threads</div><div class="sp-history-list">${archiveThreads.map(item => `<button type="button" class="sp-history-item${item.status === 'saved' ? ' is-saved' : ''}${item.id === pulseState.activeThreadId ? ' is-active' : ''}" data-open-thread="${esc(item.id)}"><span class="m">${esc(item.status || 'active')}${item.mode ? ` · ${esc(item.mode)}` : ''}${item.ts ? ` · ${esc(item.ts)}` : ''}${item.includeInContext === false ? ' · excluded' : ''}</span>${esc(item.title || 'Untitled room')}${item.messageCount ? `<br><span style="color:var(--muted2)">${esc(`${item.messageCount} messages`)}</span>` : ''}</button>`).join('') || '<div class="sp-history-item"><span class="m">ready</span>No saved Pulse threads yet.</div>'}</div>`;
	    const liveThreadMarkup = liveThreadLaneMarkup(liveResp);
	    return `
	    <div class="cc-shell v395-shell">
	      <div class="sp-open-workspace">
	        <div class="sp-control-strip">
	          <div class="sp-studio-mark">
	            <div class="sp-kicker">Studio Pulse</div>
	            <h1 class="sp-headline">Open room workspace</h1>
	            <div class="sp-subcopy">Ask what you need. Room chat is live. Workflow and commit tools are paused during the rebuild, so the room can reset cleanly.</div>
	          </div>
	          <div class="sp-drawer-tabs">
	            ${accordion('info', 'Pulse info', 'Aisha-led posture, counts, and operating stance', infoBody)}
	            ${accordion('modes', `Mode: ${pulseState.mode}`, `Current mode: ${pulseState.mode}`, modesBody)}
	            ${accordion('tuning', 'Tuning', `Editing ${characterLabel(pulseState.selectedTuningChar)}`, characterTuningMarkup())}
	            ${accordion('snapshot', 'Snapshot', 'Continuity, routes, and relationship state', snapshotBody)}
	            ${accordion('archive', `Archive (${(pulseState.history || []).length})`, `${(pulseState.history || []).length} local Pulse turn${(pulseState.history || []).length===1?'':'s'}`, archiveBody)}
	          </div>
	        </div>
	        <div class="sp-drawer-stack">
	          ${drawerPanel('info', infoBody)}
	          ${drawerPanel('modes', modesBody)}
	          ${drawerPanel('tuning', characterTuningMarkup())}
	          ${drawerPanel('snapshot', snapshotBody)}
	          ${drawerPanel('archive', archiveBody)}
	        </div>
	        ${hasThread ? `
	        <div class="cc-glass sp-thread-shell">
	          <div class="sp-thread-head">
	            <div><div class="sp-kicker">Live thread</div><div class="cc-title" style="font-size:var(--type-md)">${esc(shellThreadTitle)}</div>${responseMeta ? `<div class="small-note" id="sp-response-meta" style="margin-top:6px;color:var(--muted2);font-size:var(--type-xs)">${responseMeta}</div>` : `<div class="small-note" id="sp-response-meta" style="display:none"></div>`}</div>
	            <div class="cc-toolbar-right" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="sp-new-chat">New chat</button><button class="btn btn-ghost btn-sm" id="sp-save-chat">Save chat</button><button class="btn btn-ghost btn-sm" id="sp-open-archive-head">Open archive</button><button class="btn btn-ghost btn-sm" id="sp-clear">Clear response</button></div>
	          </div>
	          ${roomPresenceStripMarkup()}
	          <div class="sp-thread-stage">
	            <div class="sp-response-wrap" id="sp-response-wrap">
	              <div id="sp-spark-slot">${sparkLaneMarkup()}</div>
	              <div class="sp-thread-live" id="sp-thread-live">${liveThreadMarkup}</div>
	              <div id="sp-toggle-row-wrap">${showNotesToggle ? notesToggleMarkup(resp) : ''}</div>
	              <div class="sp-thinking-panel${detachCurrentTurn && showNotesToggle && showThinking ? ' is-open' : ''}">
	                <div class="sp-response-grid">
	                  ${responseCard('Actions', ((resp?.actions) || []).map(x => '• ' + esc(x)).join('<br>') || '—')}
	                  ${responseCard('Consistency checks', ((resp?.consistencyChecks) || []).map(x => '• ' + esc(x)).join('<br>') || '—')}
	                  ${responseCard('Suggested assets', ((resp?.suggestedAssets) || []).map(x => '• ' + esc(x)).join('<br>') || '—')}
	                  ${responseCard('Prompt ideas', ((resp?.promptIdeas) || []).map(x => '• ' + esc(x)).join('<br>') || '—')}
	                  ${responseCard('Relationship movement', ((resp?.relationshipDeltas) || []).map(x => `• ${esc(characterLabel(x.a))} / ${esc(characterLabel(x.b))}: ${esc(x.note || 'small shift')}`).join('<br>') || '—')}
	                  ${responseCard('Participants', ((resp?.participants) || ['aisha']).map(x => esc(characterLabel(x))).join('<br>') || 'Aisha Motsepe')}
	                </div>
	              </div>
	            </div>
	            <div class="sp-compose-dock">
	              ${launchComposerMarkup()}
	            </div>
	          </div>
	        </div>` : `
	        <div class="cc-glass sp-launchpad">
	          <div class="sp-hero">
	            <div class="sp-kicker">Studio Pulse</div>
	            <h1 class="sp-headline">Open the room</h1>
	            <div class="sp-subcopy">Start with the real thing. This launch is room-first on purpose. Workflow and commit tools are paused while the rebuild settles.</div>
	          </div>
	          ${roomPresenceStripMarkup()}
	          ${launchComposerMarkup()}
	          <div class="sp-chip-track">${quickPromptChips().map(q => `<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
	        </div>`}
	      </div>
	    </div>`;
	  }

  function consistencyCounts(){
    ensureState();
    const profiles = pulseState.homes || {};
    let home=0, outfits=0, items=0, vehicles=0;
    Object.values(profiles).forEach((p) => {
      home += ['livingRoom','bedroom','kitchen','bathroom','workspace','exterior'].filter(k => p?.home?.[k]).length;
      outfits += Array.isArray(p?.outfits) ? p.outfits.filter(Boolean).length : 0;
      items += Object.entries(p?.items || {}).filter(([k,v]) => k !== 'car' && !!v).length;
      vehicles += p?.items?.car ? 1 : 0;
    });
    return { home, outfits, items, vehicles };
  }

  function performStudioPulseHomeRender(){
    patchChrome();
    const page = byId('page-home');
    if (!page) return;
    captureThreadScrollState();
    captureComposerState();
    page.innerHTML = `<div class="page-title">Studio Pulse</div><div class="page-sub">Strategic guidance, system memory, review pressure, and continuity support.</div>${studioHomeMarkup()}`;
    if (window.applySilvaChromeVersion) window.applySilvaChromeVersion();
    bindStudioPulseHome();
    bindThreadScroll();
    restoreThreadScrollState();
    restoreComposerState();
    scheduleSparkPulse();
  }
  function renderStudioPulseHome(options){
    const opts = options && typeof options === 'object' ? options : {};
    if (opts.immediate === true) {
      if (pulseRuntime.renderFrame) cancelAnimationFrame(pulseRuntime.renderFrame);
      pulseRuntime.renderFrame = 0;
      pulseRuntime.renderQueued = false;
      performStudioPulseHomeRender();
      return;
    }
    if (pulseRuntime.renderQueued) return;
    pulseRuntime.renderQueued = true;
    pulseRuntime.renderFrame = requestAnimationFrame(() => {
      pulseRuntime.renderFrame = 0;
      pulseRuntime.renderQueued = false;
      performStudioPulseHomeRender();
    });
  }

  
  function inferQuestionMode(question, currentMode){
    const q = String(question || '').toLowerCase().trim();
    if (!q) return currentMode || 'direction';
    if (/(who|smartest|coolest|trendiest|oldest|funniest|serious|focused|surname|how many characters)/.test(q)) return 'direction';
    if (/(home|room|outfit|car|phone|item|asset|reference|refs)/.test(q)) return 'assets';
    if (/(prompt|generator|caption)/.test(q)) return 'prompt';
    if (/(plan|content|campaign|post|calendar)/.test(q)) return 'content';
    return currentMode || 'direction';
  }

	  function clientFallbackStudioPulse(question){
	    const q = String(question || '').toLowerCase();
	    if (/\b(joke|funny|laugh)\b/.test(q)) {
	      return {
	        title:'Open room',
	        summary:'',
	        chair:'aisha',
	        departmentLead:'vanya',
	        messageEvents:[
	          { speakerId:'vanya', kind:'message', tone:'playful', text:`Backend's wobbling, so here's the emergency joke: apparently "quick fix" is still a recognized genre.` },
	          { speakerId:'leah', kind:'message', tone:'dry', text:`And somehow "we'll polish it later" keeps getting commissioned for sequels.` },
	          { speakerId:'aisha', kind:'message', tone:'composed', text:`Laugh once, then retry the route properly.` }
	        ],
	        relationshipDeltas:[]
	      };
	    }
	    if (/\b(hungry|pizza|food|lunch|dinner)\b/.test(q)) {
	      return {
	        title:'Open room',
	        summary:'',
	        chair:'aisha',
	        departmentLead:'vanya',
	        messageEvents:[
	          { speakerId:'vanya', kind:'message', tone:'playful', text:`The room is alive enough to want food. The route is just being rude about it.` },
	          { speakerId:'grok', kind:'message', tone:'deadpan', text:`Morale remains recoverable. Transport layer less so.` },
	          { speakerId:'aisha', kind:'message', tone:'composed', text:`Retry once. Then we can discuss pizza with standards intact.` }
	        ],
	        relationshipDeltas:[]
	      };
	    }
	    if (/\baisha\b/.test(q)) {
	      return {
	        title:'Open room',
	        summary:'',
	        chair:'aisha',
	        departmentLead:'aisha',
	        messageEvents:[
	          { speakerId:'aisha', kind:'message', tone:'composed', text:`I'm in the room. The handoff slipped, not me.` },
	          { speakerId:'vanya', kind:'message', tone:'support', text:`Exactly. The route stumbled. She didn't.` }
	        ],
	        relationshipDeltas:[]
	      };
	    }
	    return {
	      title:'Open room',
	      summary:'',
	      chair:'aisha',
	      departmentLead:'vanya',
	      messageEvents:[
	        { speakerId:'vanya', kind:'message', tone:'warm', text:'The room is still here. The backend handoff just slipped for a second.' },
	        { speakerId:'grok', kind:'message', tone:'diagnostic', text:'I did not get a clean Studio Pulse payload back, so treat this as a soft fallback, not the final truth.' },
	        { speakerId:'aisha', kind:'message', tone:'composed', text:'Retry once. If it still stumbles, then we check the connection properly.' }
	      ],
	      aishaFrame:'The room is still here. The backend handoff just slipped for a second.',
	      departmentPerspective:'I did not get a clean Studio Pulse payload back, so treat this as a soft fallback, not the final truth.',
	      councilNotes:[{speaker:'aisha',text:'Retry once. If it still stumbles, then we check the connection properly.',stance:'composed'}],
	      teamTension:[],
	      aishaFinal:'Do not make a real decision off a broken handoff. Retry once and then verify the connection cleanly.',
	      actions:['Retry the question once.','Check that GEMINI_API_KEY is available in the local .env.'],
	      consistencyChecks:['Do not rely on the client fallback for normal use.'],
	      suggestedAssets:[],
	      promptIdeas:[],
	      relationshipDeltas:[]
	    };
	  }
	  function readFileAsDataUrl(file){
	    return new Promise((resolve, reject) => {
	      const reader = new FileReader();
	      reader.onload = () => resolve(String(reader.result || ''));
	      reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
	      reader.readAsDataURL(file);
	    });
	  }
	  function readFileAsText(file){
	    return new Promise((resolve, reject) => {
	      const reader = new FileReader();
	      reader.onload = () => resolve(String(reader.result || ''));
	      reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
	      reader.readAsText(file);
	    });
	  }
	  async function fileToPulseDraft(file){
	    const dataUrl = await readFileAsDataUrl(file);
	    let textExtract = '';
	    if ((file.type || '').startsWith('text/') || /\.(txt|md|markdown|json|csv|tsv)$/i.test(file.name || '')) {
	      try { textExtract = await readFileAsText(file); } catch(e){}
	    }
	    return {
	      name: String(file.name || 'Upload'),
	      mimeType: String(file.type || 'application/octet-stream'),
	      kind: ((file.type || '').startsWith('image/') ? 'image' : (/pdf/i.test(file.type || '') ? 'pdf' : (textExtract ? 'text' : 'file'))),
	      source: 'upload',
	      dataUrl,
	      previewUrl: (file.type || '').startsWith('image/') ? dataUrl : '',
	      textExtract
	    };
	  }
	  async function uploadPulseAttachments(items){
	    const drafts = Array.isArray(items) ? items.filter(Boolean) : [];
	    if (!drafts.length) return null;
	    const res = await fetch('/api/studio/pulse/assets', {
	      method: 'POST',
	      headers: { 'Content-Type': 'application/json' },
	      body: JSON.stringify({
	        threadId: pulseState.activeThreadId || '',
	        threadTitle: pulseState.activeThreadTitle || composerDraftValue() || 'Open room',
	        includeInContext: pulseState.activeThreadIncludeInContext !== false,
	        mode: pulseState.mode || 'direction',
	        items: drafts
	      })
	    });
	    const payload = await res.json();
	    if (!payload?.ok) throw new Error(payload?.error || 'Upload failed.');
	    if (payload?.thread?.id) {
	      pulseState.activeThreadId = String(payload.thread.id || '');
	      pulseState.activeThreadTitle = String(payload.thread.title || pulseState.activeThreadTitle || 'Open room');
	      pulseState.activeThreadStatus = String(payload.thread.status || pulseState.activeThreadStatus || 'active');
	      pulseState.activeThreadIncludeInContext = payload.thread.includeInContext !== false;
	    }
	    syncPulseWorkflowPayload(payload);
	    savePulse();
	    renderStudioPulseHome();
	    return payload;
	  }
	  async function removePulseAttachment(id){
	    const targetId = String(id || '').trim();
	    if (!targetId) return;
	    const res = await fetch(`/api/studio/pulse/assets/${encodeURIComponent(targetId)}`, { method:'DELETE' });
	    const payload = await res.json();
	    if (!payload?.ok) throw new Error(payload?.error || 'Could not remove attachment.');
	    syncPulseWorkflowPayload(payload);
	    savePulse();
	    renderStudioPulseHome();
	  }
	  function latestGalleryAttachmentDraft(){
	    const gallery = Array.isArray(window.STATE?.gallery) ? STATE.gallery : [];
	    const latest = [...gallery].reverse().find(item => String(item?.imgSrc || '').trim()) || null;
	    if (!latest) return null;
	    return {
	      name: String(latest.title || 'Gallery output'),
	      mimeType: 'image/png',
	      kind: 'image',
	      source: 'gallery',
	      dataUrl: String(latest.imgSrc || ''),
	      previewUrl: String(latest.imgSrc || ''),
	      textExtract: ''
	    };
	  }
	  function workflowStarter(intent){
	    switch (String(intent || '').trim().toLowerCase()) {
	      case 'analyze-media': return 'Analyze the current upload and tell the room what is actually visible or useful.';
	      case 'make-image': return 'Use the current material and make an image plan with the room.';
	      case 'plan-post': return 'Plan this post with the team and get it commit-ready.';
	      case 'plan-calendar': return 'Plan the next calendar slot cleanly.';
	      case 'plan-event': return 'Plan this event properly with owners and timing.';
	      default: return '';
	    }
	  }
	  function setWorkflowIntentDraft(intent, options){
	    if (WORKFLOWS_DISABLED) {
	      pulseState.workflowIntentDraft = '';
	      savePulse({ global:false });
	      if (options?.render) renderStudioPulseHome();
	      return;
	    }
	    const next = String(intent || '').trim();
	    pulseState.workflowIntentDraft = next;
	    savePulse({ global:false });
	    if (options?.render) renderStudioPulseHome();
	  }
	  function collapseSecondaryChrome(options){
	    const keepComposerPanels = options?.keepComposerPanels === true;
	    pulseState.openPanels = Object.assign({}, pulseState.openPanels || {});
	    pulseState.openPanels.info = false;
	    pulseState.openPanels.modes = false;
	    pulseState.openPanels.snapshot = false;
	    pulseState.openPanels.tuning = false;
	    pulseState.openPanels.archive = false;
	    if (!keepComposerPanels) {
	      pulseState.openPanels.composerTools = false;
	      pulseState.openPanels.apiKeys = false;
	      pulseState.openPanels.mediaActions = false;
	    }
	  }
	  function markSparkTouch(){
	    pulseRuntime.lastSparkTouchAt = Date.now();
	  }
	  function canScheduleSpark(options){
	    const opts = options && typeof options === 'object' ? options : {};
	    const manual = opts.manual === true;
	    if (WORKFLOWS_DISABLED && !manual) return false;
	    if (window.location.protocol === 'file:') return false;
	    if (document.hidden) return false;
	    if (pulseRuntime.requestInFlight || pulseRuntime.sparkInFlight || pulseRuntime.isSequencing || Array.isArray(pulseRuntime.pendingThreadMessages)) return false;
	    if (!manual && !String(pulseState.activeThreadId || '').trim()) return false;
	    if (String(pulseState.activeThreadStatus || 'active') === 'archived') return false;
	    const page = byId('page-home');
	    if (!page || !page.classList.contains('active')) return false;
	    if (!manual && (pulseRuntime.composerFocused || Boolean(String(pulseState.composerDraft || '').trim()))) return false;
	    if (!manual && pulseRuntime.lastSparkTouchAt && (Date.now() - pulseRuntime.lastSparkTouchAt) < 45000) return false;
	    const allMessages = normalizeThreadMessages(pulseState.threadMessages);
	    const messages = allMessages.filter(item => String(item?.kind || '').toLowerCase() !== 'spark');
	    if (!manual && messages.length < 3) return false;
	    const last = allMessages[allMessages.length - 1] || {};
	    const lastTs = Date.parse(String(last.createdAt || '')) || 0;
	    if (!manual && String(last.kind || '').toLowerCase() === 'spark' && Date.now() - lastTs < 45000) return false;
	    return true;
	  }
	  async function requestSparkPulse(options){
	    const opts = options && typeof options === 'object' ? options : {};
	    const manual = opts.manual === true;
	    clearSparkTimer();
	    if (!canScheduleSpark({ manual })) return;
	    beginPulseRequest();
	    pulseRuntime.sparkInFlight = true;
	    if (manual) renderStudioPulseHome();
	    try {
	      const res = await fetch('/api/studio/pulse/idle-tick', {
	        method: 'POST',
	        headers: { 'Content-Type': 'application/json' },
	        body: JSON.stringify({
	          manual,
	          forceVisible: manual,
	          source: manual ? 'spark-button' : 'idle-scheduler',
	          mode: pulseState.mode || 'direction',
	          counts: consistencyCounts(),
	          history: pulseState.history || [],
	          threadId: pulseState.activeThreadId || '',
	          includeInContext: pulseState.activeThreadIncludeInContext !== false,
	          characterTuning: pulseState.characterTuning || {},
	          councilTuning: pulseState.councilTuning || {},
	          characterBehaviorTree: buildCharacterBehaviorTreePayload(),
	          councilBehavior: buildCouncilBehaviorPayload(),
	          relationships: pulseState.relationships || {},
	          liveState: buildLiveStatePayload()
	        })
	      });
	      const payload = await res.json();
	      markSparkTouch();
	      if (!payload?.ok) {
	        if (manual && window.toast) toast('The room stayed quiet.');
	        return;
	      }
	      if (payload?.thread?.id) {
	        pulseState.activeThreadId = String(payload.thread.id || pulseState.activeThreadId || '');
	        pulseState.activeThreadTitle = String(payload.thread.title || pulseState.activeThreadTitle || '');
	        pulseState.activeThreadStatus = String(payload.thread.status || pulseState.activeThreadStatus || 'active');
	        pulseState.activeThreadIncludeInContext = payload.thread.includeInContext !== false;
	        pulseState.holdBlankThread = false;
	      }
	      if (Array.isArray(payload?.messages)) {
	        pulseState.threadMessages = normalizeThreadMessages(payload.messages).slice(-120);
	      }
	      if (Array.isArray(payload.relationshipUpdates)) {
	        payload.relationshipUpdates.forEach(item => { if (item?.key) pulseState.relationships[item.key] = item; });
	      }
	      syncPulseWorkflowPayload(payload);
	      applyRoomRuntimePayload(payload);
	      if (payload?.spark || payload?.manualSpark) pulseState.showSparkLane = true;
	      try {
	        window.STATE = window.STATE || {};
	        STATE.aiCommsCenter = STATE.aiCommsCenter || {};
	        STATE.aiCommsCenter.lastAmbientAt = Date.now();
	      } catch (e) {}
	      savePulse({ global:false, bridge:false });
	      renderStudioPulseHome();
	      if (manual && !payload?.response && window.toast) toast('The room stayed quiet.');
	    } catch (e) {
	      if (manual && window.toast) toast('Could not spark the room');
	    } finally {
	      pulseRuntime.sparkInFlight = false;
	      endPulseRequest();
	      if (manual) renderStudioPulseHome();
	      scheduleSparkPulse();
	    }
	  }
	  function scheduleSparkPulse(){
	    clearSparkTimer();
	    if (!canScheduleSpark()) return;
	    const delay = 15000 + Math.round(Math.random() * 18000);
	    pulseRuntime.sparkTimer = setTimeout(() => {
	      pulseRuntime.sparkTimer = null;
	      requestSparkPulse();
	    }, delay);
	  }
	  async function askStudioPulse(question, options){
	    const opts = options && typeof options === 'object' ? options : {};
	    const q = String(question || '').trim();
	    if (!q) return;
	    if (pulseRequestBusy()) {
	      if (window.toast) toast('Studio Pulse is still replying');
	      return;
	    }
	    clearComposerDraft();
	    const replyTarget = activeReplyTarget();
	    clearSparkTimer();
	    pulseState.holdBlankThread = false;
	    if (document.querySelector('[data-sp-provider-row]')) {
	      try { persistPulseProviderRows({ render:false, notify:false }); } catch(e){}
	    }
	    const requestMode = inferQuestionMode(q, pulseState.mode);
	    const workflowIntent = WORKFLOWS_DISABLED ? '' : String(opts.workflowIntent || pulseState.workflowIntentDraft || '').trim();
	    const workflowDraftId = WORKFLOWS_DISABLED ? '' : String(opts.workflowDraftId || ((workflowIntent || opts.commitRequested === true) ? (pulseState.activeWorkflowDraft?.id || '') : '')).trim();
	    clearPulseTimers();
	    pulseRuntime.isSequencing = false;
	    pulseRuntime.visibleCount = 0;
	    pulseRuntime.segments = [];
	    pulseRuntime.activeQuestion = q;
	    pulseRuntime.pendingThreadMessages = null;
	    pulseRuntime.scrollAutoFollow = true;
	    pulseRuntime.scrollGap = 0;
	    pulseState.replyTarget = null;
	    beginPulseRequest();
	    renderStudioPulseHome();
	    try {
		      const res = await fetch('/api/studio/pulse', {
		        method: 'POST',
		        headers: { 'Content-Type': 'application/json' },
		        body: JSON.stringify({ question: q, mode: requestMode, counts: consistencyCounts(), history: pulseState.history || [], threadId: pulseState.activeThreadId || '', threadTitle: pulseState.activeThreadTitle || '', includeInContext: pulseState.activeThreadIncludeInContext !== false, replyToEventId: replyTarget?.eventId || '', replyToLane: replyTarget?.lane || '', replyToSpeakerId: replyTarget?.speakerId || '', workflowIntent, workflowDraftId, commitRequested: WORKFLOWS_DISABLED ? false : opts.commitRequested === true, confirmCommit: WORKFLOWS_DISABLED ? false : opts.confirmCommit === true, characterTuning: pulseState.characterTuning || {}, councilTuning: pulseState.councilTuning || {}, characterBehaviorTree: buildCharacterBehaviorTreePayload(), councilBehavior: buildCouncilBehaviorPayload(), relationships: pulseState.relationships || {}, liveState: buildLiveStatePayload() })
		      });
	      const payload = await res.json();
	      if (!payload?.ok) throw new Error(payload?.error || 'Studio Pulse failed.');
	      const parsed = payload?.response || clientFallbackStudioPulse(q);
	      pulseState.lastResponse = normalizePulseResponse(parsed);
	      if (payload?.thread?.id) {
	        pulseState.activeThreadId = String(payload.thread.id || '');
	        pulseState.activeThreadTitle = String(payload.thread.title || q);
	        pulseState.activeThreadStatus = String(payload.thread.status || 'active');
	        pulseState.activeThreadIncludeInContext = payload.thread.includeInContext !== false;
	      } else if (!pulseState.activeThreadId) {
	        pulseState.activeThreadTitle = q;
	      }
	      if (Array.isArray(payload?.messages)) pulseRuntime.pendingThreadMessages = normalizeThreadMessages(payload.messages).slice(-120);
	      syncPulseWorkflowPayload(payload);
	      if (payload?.relationshipUpdates && Array.isArray(payload.relationshipUpdates)) {
	        payload.relationshipUpdates.forEach(item => { if (item.key) pulseState.relationships[item.key] = item; });
	      }
	      applyRoomRuntimePayload(payload);
	      pulseState.workflowIntentDraft = '';
	      collapseSecondaryChrome();
	      pulseState.lastMeta = {
        provider: payload?.provider || 'studio',
        model: payload?.model || '',
        keyLabel: payload?.keyLabel || '',
        fallback: !!payload?.fallback,
        clarification: !!payload?.clarification,
        resolvedFromHistory: !!payload?.resolvedFromHistory,
        mode: payload?.mode || requestMode,
        aishaAttempted: payload?.aishaAttempted === true,
        aishaEngineConnected: payload?.aishaEngineConnected === true,
        aishaEngineMode: payload?.aishaEngineMode || 'mock',
        activeEngine: payload?.activeEngine || 'local-room-intelligence',
        fallbackReason: payload?.fallbackReason || ''
      };
      pulseState.history.unshift({
        q,
        mode: requestMode,
        ts: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
	        summary: pulseState.lastResponse?.aishaFinal || pulseState.lastResponse?.summary || ''
	      });
      pulseState.history = pulseState.history.slice(0, 20);
	      savePulse({ global:false, bridge:false });
	      startPulseSequence(pulseState.lastResponse, q);
	    } catch (e) {
	      pulseState.lastResponse = normalizePulseResponse(clientFallbackStudioPulse(q));
	      pulseState.lastMeta = { provider:'studio', model:'', keyLabel:'', fallback:true, clarification:false, resolvedFromHistory:false, mode: requestMode, aishaAttempted:false, aishaEngineConnected:false, aishaEngineMode:'mock', activeEngine:'local-room-intelligence', fallbackReason:'client-fallback' };
	      pulseState.history.unshift({ q, mode: requestMode, ts: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), summary: '' });
	      pulseState.history = pulseState.history.slice(0, 20);
	      savePulse({ global:false, bridge:false });
	      startPulseSequence(pulseState.lastResponse, q);
	    } finally {
	      endPulseRequest();
	    }
	  }

	  function bindStudioPulseHome(){
	    document.querySelectorAll('[data-panel-toggle]').forEach(btn => btn.onclick = () => {
	      const key = btn.getAttribute('data-panel-toggle');
	      pulseState.openPanels = Object.assign({}, pulseState.openPanels || {});
	      pulseState.openPanels[key] = !(pulseState.openPanels[key] === true);
	      savePulse({ global:false });
	      renderStudioPulseHome();
	    });
	    document.querySelectorAll('[data-mode]').forEach(btn => btn.onclick = () => { pulseState.mode = btn.getAttribute('data-mode') || 'direction'; savePulse(); renderStudioPulseHome(); });
	    const tuningChar = byId('sp-tuning-char');
	    if (tuningChar) tuningChar.onchange = () => { pulseState.selectedTuningChar = tuningChar.value || 'aisha'; savePulse(); renderStudioPulseHome(); };
	    document.querySelectorAll('[data-tuning-range]').forEach(input => input.oninput = () => {
	      const [id, key] = String(input.getAttribute('data-tuning-range') || '').split(':');
	      const value = clamp(input.value, 50);
	      const output = byId(`sp-out-${id}-${key}`);
	      if (output) output.textContent = value;
	      if (id === 'council') pulseState.councilTuning[key] = value;
	      else {
	        pulseState.characterTuning[id] = pulseState.characterTuning[id] || Object.assign({}, CHARACTER_TUNING_DEFAULTS[id] || {});
	        pulseState.characterTuning[id][key] = value;
	      }
	      savePulse();
	    });
	    document.querySelectorAll('[data-tuning-text]').forEach(input => input.onchange = () => {
	      const [id, key] = String(input.getAttribute('data-tuning-text') || '').split(':');
	      if (!id || !key) return;
	      pulseState.characterTuning[id] = pulseState.characterTuning[id] || Object.assign({}, CHARACTER_TUNING_DEFAULTS[id] || {});
	      pulseState.characterTuning[id][key] = input.value || '';
	      savePulse();
	    });
	    document.querySelectorAll('[data-tuning-tree]').forEach(input => input.onchange = () => {
	      const [id, key] = String(input.getAttribute('data-tuning-tree') || '').split(':');
	      if (!id || !key) return;
	      pulseState.characterTuning[id] = pulseState.characterTuning[id] || Object.assign({}, CHARACTER_TUNING_DEFAULTS[id] || {});
	      pulseState.characterTuning[id].behaviorTree = Object.assign({}, CHARACTER_TUNING_DEFAULTS[id]?.behaviorTree || {}, pulseState.characterTuning[id].behaviorTree || {});
	      pulseState.characterTuning[id].behaviorTree[key] = input.value || '';
	      savePulse();
	    });
	    document.querySelectorAll('[data-q]').forEach(btn => btn.onclick = () => {
      const q = btn.getAttribute('data-q') || '';
      const input = byId('sp-input');
      setComposerDraft(q);
      if (input) { input.value = q; input.focus(); }
    });
    const sparkTrigger = byId('sp-spark-trigger'); if (sparkTrigger) sparkTrigger.onclick = () => {
      requestSparkPulse({ manual:true });
    };
    const quickTool = byId('sp-tool-quick'); if (quickTool) quickTool.onclick = () => {
      if (pulseState.openPanels?.apiKeys && document.querySelector('[data-sp-provider-row]')) {
        try { persistPulseProviderRows({ render:false, notify:false }); } catch(e){}
      }
      pulseState.openPanels.composerTools = !(pulseState.openPanels?.composerTools === true);
      if (pulseState.openPanels.composerTools) {
        pulseState.openPanels.apiKeys = false;
        pulseState.openPanels.mediaActions = false;
      }
      savePulse({ global:false });
      renderStudioPulseHome();
    };
    const providerTool = byId('sp-tool-providers'); if (providerTool) providerTool.onclick = () => {
      if (pulseState.openPanels?.apiKeys && document.querySelector('[data-sp-provider-row]')) {
        try { persistPulseProviderRows({ render:false, notify:false }); } catch(e){}
      }
      pulseState.openPanels.apiKeys = !(pulseState.openPanels?.apiKeys === true);
      if (pulseState.openPanels.apiKeys) {
        pulseState.openPanels.composerTools = false;
        pulseState.openPanels.mediaActions = false;
      }
      savePulse({ global:false });
      renderStudioPulseHome();
    };
    const mediaTool = byId('sp-tool-media'); if (mediaTool) mediaTool.onclick = () => {
      pulseState.openPanels.mediaActions = !(pulseState.openPanels?.mediaActions === true);
      if (pulseState.openPanels.mediaActions) {
        pulseState.openPanels.composerTools = false;
        pulseState.openPanels.apiKeys = false;
      }
      savePulse({ global:false });
      renderStudioPulseHome();
    };
	    const send = byId('sp-send'); if (send) send.onclick = () => { if (pulseRequestBusy()) return; const input = byId('sp-input'); const q = String(input?.value || '').trim(); if (!q) return; clearComposerDraft(); if (input) input.value=''; askStudioPulse(q); };
	    const input = byId('sp-input'); if (input) {
	      input.onfocus = () => { pulseRuntime.composerFocused = true; };
	      input.onblur = () => { pulseRuntime.composerFocused = false; savePulse({ global:false, bridge:false }); };
	      input.oninput = () => {
	        setComposerDraft(input.value || '');
	        pulseRuntime.composerSelectionStart = Number.isFinite(Number(input.selectionStart)) ? Number(input.selectionStart) : 0;
	        pulseRuntime.composerSelectionEnd = Number.isFinite(Number(input.selectionEnd)) ? Number(input.selectionEnd) : pulseRuntime.composerSelectionStart;
	      };
	      input.onkeydown = (e) => {
	        if (e.key === 'Enter' && !e.shiftKey) {
	          e.preventDefault();
	          if (pulseRequestBusy()) return;
	          const q = String(input.value || '').trim();
	          if (!q) return;
	          clearComposerDraft();
	          input.value='';
	          askStudioPulse(q);
	        }
	      };
	    }
	    const clearReply = byId('sp-clear-reply'); if (clearReply) clearReply.onclick = () => clearComposerReplyTarget({ render:true });
	    document.querySelectorAll('[data-remove-attachment]').forEach(btn => btn.onclick = async () => {
	      const id = btn.getAttribute('data-remove-attachment') || '';
	      if (!id) return;
	      try { await removePulseAttachment(id); } catch (e) { window.toast && toast('Could not remove attachment'); }
	    });
	    document.querySelectorAll('[data-workflow-intent]').forEach(btn => btn.onclick = () => {
	      const intent = String(btn.getAttribute('data-workflow-intent') || '').trim();
	      if (!intent) return;
	      if (intent === 'commit-plan') {
	        revealWorkflowCommitCard({ render:true, focus:true });
	        return;
	      }
	      setWorkflowIntentDraft(intent, { render:false });
	      const input = byId('sp-input');
	      if (input && !String(input.value || '').trim()) {
	        const starter = workflowStarter(intent);
	        if (starter) {
	          input.value = starter;
	          setComposerDraft(starter);
	        }
	      }
	      if (input) input.focus();
	      renderStudioPulseHome();
	    });
	    document.querySelectorAll('[data-commit-toggle]').forEach(btn => btn.onclick = () => {
	      const action = String(btn.getAttribute('data-commit-toggle') || '').trim();
	      if (action === 'expand') {
	        revealWorkflowCommitCard({ render:true, focus:true });
	        return;
	      }
	      if (action === 'hide') {
	        setWorkflowCommitDisplay('hidden', { render:true });
	      }
	    });
	    document.querySelectorAll('[data-workflow-start]').forEach(btn => btn.onclick = () => {
	      const intent = String(btn.getAttribute('data-workflow-start') || '').trim();
	      if (!intent) return;
	      if (intent === 'analyze-media' && !activeThreadAttachments().length) {
	        if (window.toast) toast('Attach an image or file first');
	        return;
	      }
	      setWorkflowIntentDraft(intent, { render:false });
	      const input = byId('sp-input');
	      const starter = workflowStarter(intent);
	      if (input && !String(input.value || '').trim() && starter) {
	        input.value = starter;
	        setComposerDraft(starter);
	      }
	      if (input) input.focus();
	      renderStudioPulseHome();
	    });
	    const stageCommit = byId('sp-stage-commit'); if (stageCommit) stageCommit.onclick = () => {
	      const workflowId = String(stageCommit.getAttribute('data-workflow-id') || activeWorkflowDraft()?.id || '').trim();
	      if (!workflowId) return;
	      askStudioPulse('Stage this plan for commit.', { workflowIntent:'commit-plan', workflowDraftId: workflowId, commitRequested:true });
	    };
	    const confirmCommit = byId('sp-confirm-commit'); if (confirmCommit) confirmCommit.onclick = () => {
	      const workflowId = String(confirmCommit.getAttribute('data-workflow-id') || activeWorkflowDraft()?.id || '').trim();
	      if (!workflowId) return;
	      askStudioPulse('Commit this plan cleanly.', { workflowIntent:'commit-plan', workflowDraftId: workflowId, commitRequested:true, confirmCommit:true });
	    };
	    document.querySelectorAll('[data-pulse-action]').forEach(btn => btn.onclick = async () => {
	      const action = String(btn.getAttribute('data-pulse-action') || '').trim();
	      if (action === 'upload-image') { byId('sp-upload-image')?.click(); return; }
	      if (action === 'upload-file') { byId('sp-upload-file')?.click(); return; }
	      if (action === 'use-gallery') {
	        const draft = latestGalleryAttachmentDraft();
	        if (!draft) { window.toast && toast('No gallery output is ready yet'); return; }
	        try {
	          await uploadPulseAttachments([draft]);
	        } catch (e) {
	          window.toast && toast('Could not attach gallery output');
	        }
	      }
	    });
	    const imageUpload = byId('sp-upload-image'); if (imageUpload) imageUpload.onchange = async () => {
	      const files = Array.from(imageUpload.files || []);
	      imageUpload.value = '';
	      if (!files.length) return;
	      try {
	        const drafts = await Promise.all(files.map(fileToPulseDraft));
	        await uploadPulseAttachments(drafts);
	      } catch (e) {
	        window.toast && toast('Image upload failed');
	      }
	    };
	    const fileUpload = byId('sp-upload-file'); if (fileUpload) fileUpload.onchange = async () => {
	      const files = Array.from(fileUpload.files || []);
	      fileUpload.value = '';
	      if (!files.length) return;
	      try {
	        const drafts = await Promise.all(files.map(fileToPulseDraft));
	        await uploadPulseAttachments(drafts);
	      } catch (e) {
	        window.toast && toast('File upload failed');
	      }
	    };
	    const newChat = byId('sp-new-chat'); if (newChat) newChat.onclick = () => beginNewPulseThread();
	    const clear = byId('sp-clear'); if (clear) clear.onclick = () => resetPulseThreadView();
	    const saveChat = byId('sp-save-chat'); if (saveChat) saveChat.onclick = async () => {
	      const savedThread = await patchActiveThreadStatus('saved');
	      const savedNote = archiveCurrentPulse();
	      await refreshPulseHistory(true, { threadId: pulseState.activeThreadId, preserveBlank:false });
	      if (savedThread || savedNote) {
	        if (window.toast) toast('Studio Pulse chat saved');
	      } else if (window.toast) {
	        toast('Nothing new to save yet');
	      }
    };
	    const openArchiveHead = byId('sp-open-archive-head'); if (openArchiveHead) openArchiveHead.onclick = () => {
      pulseState.openPanels.archive = true;
      savePulse({ global:false });
      renderStudioPulseHome();
      refreshPulseHistory(true, { preserveBlank:true });
    };
    const toggleThinking = byId('sp-toggle-thinking'); if (toggleThinking) toggleThinking.onclick = () => { pulseState.showThinking = !(pulseState.showThinking === true); savePulse({ global:false }); renderStudioPulseHome(); };
    const openHomes = byId('sp-open-homes'); if (openHomes) openHomes.onclick = () => window.nav && window.nav('homes');
    const openAssets = byId('sp-open-assets'); if (openAssets) openAssets.onclick = () => window.nav && window.nav('assets');
    const openGallery = byId('sp-open-gallery'); if (openGallery) openGallery.onclick = () => window.nav && window.nav('gallery');
    const openPlanner = byId('sp-open-planner'); if (openPlanner) openPlanner.onclick = () => window.nav && window.nav('planner');
    const openArchive = byId('sp-tool-open-archive'); if (openArchive) openArchive.onclick = () => {
      pulseState.openPanels.archive = true;
      pulseState.openPanels.composerTools = false;
      savePulse({ global:false });
      renderStudioPulseHome();
      refreshPulseHistory(true, { preserveBlank:true });
    };
    const toggleSparks = byId('sp-toggle-sparks'); if (toggleSparks) toggleSparks.onclick = () => {
      pulseState.showSparkLane = pulseState.showSparkLane === false;
      savePulse({ global:false });
      renderStudioPulseHome();
    };
	    document.querySelectorAll('[data-open-thread]').forEach(btn => btn.onclick = () => {
	      const threadId = btn.getAttribute('data-open-thread') || '';
	      if (!threadId) return;
	      openPulseThread(threadId);
	    });
	    document.querySelectorAll('[data-reply-spark]').forEach(btn => btn.onclick = () => {
	      const eventId = String(btn.getAttribute('data-reply-spark') || '').trim();
	      if (!eventId) return;
	      const target = normalizeThreadMessages(pulseState.threadMessages).find(item => String(item.id || '').trim() === eventId && String(item.kind || '').toLowerCase() === 'spark');
	      if (!target) return;
	      setComposerReplyTarget(target);
	    });
    const openTuning = byId('sp-tool-open-tuning'); if (openTuning) openTuning.onclick = () => {
      pulseState.openPanels.tuning = true;
      pulseState.openPanels.composerTools = false;
      savePulse({ global:false });
      renderStudioPulseHome();
    };
    const openSnapshot = byId('sp-tool-open-snapshot'); if (openSnapshot) openSnapshot.onclick = () => {
      pulseState.openPanels.snapshot = true;
      pulseState.openPanels.composerTools = false;
      savePulse({ global:false });
      renderStudioPulseHome();
    };
    const addProvider = byId('sp-provider-add'); if (addProvider) addProvider.onclick = () => {
      const cfg = loadProviderShell();
      cfg.pulseApiKeys = cfg.pulseApiKeys || [];
      cfg.pulseApiKeys.push(normalizeProviderEntry({ label:`Fallback ${cfg.pulseApiKeys.length + 1}`, provider:'gemini', model:'gemini-2.5-flash', apiKey:'', enabled:true }, cfg.pulseApiKeys.length));
      saveProviderShell(cfg);
      pulseState.openPanels.apiKeys = true;
      savePulse();
      renderStudioPulseHome();
    };
    document.querySelectorAll('[data-provider-remove]').forEach(btn => btn.onclick = () => {
      const target = btn.getAttribute('data-provider-remove');
      const cfg = loadProviderShell();
      cfg.pulseApiKeys = (cfg.pulseApiKeys || []).filter(item => String(item.id) !== String(target));
      saveProviderShell(cfg);
      renderStudioPulseHome();
    });
    document.querySelectorAll('[data-sp-provider-row] [data-provider-prop]').forEach(input => {
      const prop = input.getAttribute('data-provider-prop') || '';
      if (prop === 'enabled') input.onchange = () => queuePulseProviderAutosave();
      else {
        input.oninput = () => queuePulseProviderAutosave();
        input.onchange = () => queuePulseProviderAutosave();
        input.onblur = () => queuePulseProviderAutosave();
      }
    });
    const saveProvider = byId('sp-provider-save'); if (saveProvider) saveProvider.onclick = () => {
      persistPulseProviderRows({ render:true, notify:true });
    };
    const openProviderSettings = byId('sp-open-provider-settings'); if (openProviderSettings) openProviderSettings.onclick = () => {
      try { persistPulseProviderRows({ render:false, notify:false }); } catch(e){}
      window.nav && window.nav('providers');
    };
  }

  function ensureHomeSystemState(){
    ensureState();
    pulseState.homes = pulseState.homes || {};
    ['aisha','leah','claudia','grok','vanya'].forEach(id => {
      pulseState.homes[id] = pulseState.homes[id] || { home:{}, outfits:[null,null,null,null,null,null], items:{ phone:null, car:null, bag:null, laptop:null, keys:null, eyewear:null, signature:null }, notes:'', usageRule:'Use selectively when relevant to the prompt or scene. Never force these into every generation.' };
    });
    bridgePulseHomesIntoState();
    savePulse();
  }

  function renderHomesV395(){
    ensureHomeSystemState();
    const page = byId('page-homes');
    if (!page) return;
    const filter = byId('home-char')?.value || 'all';
    const search = (byId('home-search')?.value || '').toLowerCase();
    const ids = ['leah','claudia','grok','vanya'].filter(id => (filter === 'all' || filter === id) && (!search || (id + ' ' + JSON.stringify(pulseState.homes[id] || {})).toLowerCase().includes(search)));
    page.innerHTML = `<div class="page-title">Home System</div><div class="page-sub">Residence, outfit, and item consistency. These references are available to the system when relevant. They are not forced into every generation.</div>
      <div class="planner-tip">Item references are optional anchors. A phone, car, bag, or home reference should only be used when the scene truly benefits from it.</div>
      <div class="filter-bar"><select class="filter-select" id="home-char"><option value="all">All Characters</option><option value="leah">Leah</option><option value="claudia">Claudia</option><option value="grok">Grok</option><option value="vanya">Vanya</option></select><input class="search-input" id="home-search" placeholder="Search consistency notes..."></div>
      <div class="home-grid" id="homes-grid">${ids.map(homeProfileCard).join('')}</div>`;
    byId('home-char').value = filter;
    byId('home-search').value = search;
    byId('home-char').onchange = renderHomesV395;
    byId('home-search').oninput = renderHomesV395;
  }

  function homeProfileCard(id){
    const c = (window.getChar && window.getChar(id)) || CHARS[id] || { name:id, role:'' };
    const p = pulseState.homes[id];
    return `<div class="home-card">
      <div class="home-head"><div><div class="home-title">${esc(c.name || c.label)}</div><div class="home-sub">${esc(c.role || '')}</div></div><span class="mode-indicator">Selective refs</span></div>
      <div class="home-body">
        <div class="home-row"><div class="home-key">Usage</div><div class="home-val">${esc(p.usageRule)}</div></div>
        <div class="section-title" style="font-size:var(--type-xs);margin:12px 0 8px">Home / Exterior</div>
        <div class="home-slots home-slots-3">${slotHtml(id,'home','livingRoom','Living room')}${slotHtml(id,'home','bedroom','Bedroom')}${slotHtml(id,'home','workspace','Workspace')}${slotHtml(id,'home','kitchen','Kitchen')}${slotHtml(id,'home','bathroom','Bathroom')}${slotHtml(id,'home','exterior','Exterior')}</div>
        <div class="section-title" style="font-size:var(--type-xs);margin:12px 0 8px">Outfit sets</div>
        <div class="home-slots home-slots-3">${[0,1,2,3,4,5].map(i => slotHtml(id,'outfit',String(i),'Outfit '+(i+1))).join('')}</div>
        <div class="section-title" style="font-size:var(--type-xs);margin:12px 0 8px">Unique items</div>
        <div class="home-slots home-slots-3">${slotHtml(id,'item','phone','Phone')}${slotHtml(id,'item','car','Car')}${slotHtml(id,'item','bag','Bag')}${slotHtml(id,'item','laptop','Laptop')}${slotHtml(id,'item','keys','Keys')}${slotHtml(id,'item','signature','Signature item')}</div>
        <div class="gen-label" style="margin-top:12px">Consistency notes</div>
        <textarea class="asset-notes" id="cons-note-${id}" placeholder="What should the system know about these spaces, outfits, and objects?">${esc(p.notes || '')}</textarea>
        <div class="home-actions"><button class="btn btn-ghost btn-sm" onclick="window.saveConsistencyNotes('${id}')">Save notes</button><button class="btn btn-ghost btn-sm" onclick="window.copyConsistencySummary('${id}')">Copy summary</button></div>
      </div>
    </div>`;
  }

  function slotHtml(id, kind, key, label){
    const src = getSlot(id, kind, key);
    return `<div class="home-slot ${src ? 'has-img' : ''}" onclick="window.uploadConsistencyRef('${id}','${kind}','${key}')">${src ? `<img src="${src}">` : ''}<div class="home-slot-ph">${esc(label)}<br><span style="font-size:var(--type-2xs);opacity:.6">Click to upload</span></div></div>`;
  }

  function getSlot(id, kind, key){
    const p = pulseState.homes[id] || {};
    if (kind === 'home') return p.home?.[key] || '';
    if (kind === 'outfit') return p.outfits?.[Number(key)] || '';
    if (kind === 'item') return p.items?.[key] || '';
    return '';
  }

  function setSlot(id, kind, key, value){
    const p = pulseState.homes[id] || (pulseState.homes[id] = { home:{}, outfits:[null,null,null,null,null,null], items:{}, notes:'', usageRule:'Use selectively when relevant to the prompt or scene. Never force these into every generation.' });
    if (kind === 'home') { p.home = p.home || {}; p.home[key] = value; }
    if (kind === 'outfit') { p.outfits = p.outfits || [null,null,null,null,null,null]; p.outfits[Number(key)] = value; }
    if (kind === 'item') { p.items = p.items || {}; p.items[key] = value; }
    savePulse();
  }

  window.uploadConsistencyRef = function(id, kind, key){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { setSlot(id, kind, key, reader.result); renderHomesV395(); };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  window.saveConsistencyNotes = function(id){
    const p = pulseState.homes[id];
    if (!p) return;
    const val = byId('cons-note-' + id)?.value || '';
    p.notes = val;
    savePulse();
    renderHomesV395();
  };

  window.copyConsistencySummary = function(id){
    const p = pulseState.homes[id];
    if (!p) return;
    const summary = [
      `Character: ${CHARS[id]?.label || id}`,
      `Usage rule: ${p.usageRule}`,
      `Home refs: ${Object.keys(p.home || {}).filter(k => p.home[k]).join(', ') || 'none'}`,
      `Outfit refs: ${(p.outfits || []).filter(Boolean).length}`,
      `Item refs: ${Object.keys(p.items || {}).filter(k => p.items[k]).join(', ') || 'none'}`,
      `Notes: ${p.notes || 'none'}`
    ].join('\n');
    navigator.clipboard.writeText(summary).then(() => { if (window.toast) toast('Consistency summary copied'); });
  };

  function patchGeneratorForConsistency(){
    if (window.__V395_GENERATOR_PATCHED) return;
    window.__V395_GENERATOR_PATCHED = true;
    const oldGenerate = window.generateFullKit;
    if (typeof oldGenerate !== 'function') return;
    window.generateFullKit = function(){
      oldGenerate();
      try {
        const panel = byId('gen-output-panel');
        const char = byId('g-char')?.value || 'leah';
        const profile = pulseState.homes[char] || {};
        const relevant = [
          profile.home?.workspace && 'workspace / interior ref',
          profile.home?.livingRoom && 'living room ref',
          profile.home?.exterior && 'exterior ref',
          (profile.outfits || []).filter(Boolean).length ? 'outfit set refs' : '',
          profile.items?.phone && 'phone ref (only if scene needs it)',
          profile.items?.car && 'car ref (only if scene needs it)',
          profile.items?.bag && 'bag ref',
          profile.items?.laptop && 'laptop ref'
        ].filter(Boolean);
        if (panel && !panel.querySelector('.v395-consistency-block')) {
          panel.insertAdjacentHTML('beforeend', `<div class="output-block v395-consistency-block"><div class="output-label">Selective consistency references</div><div class="output-text">${relevant.length ? esc(relevant.join(' · ')) : 'No extra consistency refs stored yet for this character.'}<br><br>Rule: use these only if the scene genuinely benefits from them. Do not force props into every generation.</div></div>`);
        }
      } catch (e) { console.warn(e); }
    };
  }

  function install(){
    patchChrome();
    ensureHomeSystemState();
    patchGeneratorForConsistency();
    refreshPulseHistory(!!document.getElementById('page-home')?.classList.contains('active'), { preserveBlank:true });

    // hard-disable old room/chat globals
    const noOp = function(){};
    window.__ROOM_SUBSYSTEM_LOCKED = true;
    window.RoomSubsystem = undefined;
    window.askRoom396 = noOp;
    window.askStudio = noOp;
    window.v393AskRoom = noOp;
    window.v393AskSelected = noOp;
    window.generateStudioConversation = noOp;
    window.refreshStudioPulse = noOp;
    window.localSelected = noOp;
    window.roomViaGemini396 = noOp;
    window.pushTone = noOp;
    window.pushTone393 = noOp;
    window.v396ResetThread = noOp;
    window.resetRoomThread = noOp;
    if (typeof window.buildEvent === 'function') window.buildEvent = function(){ return { type:'noop_v395', payload:{}, target:'studio' }; };

    // override home/homes renderers
    window.renderHomeComms = noOp;
    window.renderHome393 = renderStudioPulseHome;
    window.renderHome396 = renderStudioPulseHome;
    window.renderHomeAlive = renderStudioPulseHome;
    window.renderHome = renderStudioPulseHome;

    const oldNav = window.nav;
    if (typeof oldNav === 'function' && !window.__V395_NAV_WRAPPED) {
      window.__V395_NAV_WRAPPED = true;
      window.nav = function(page){
        const out = oldNav.call(this, page);
        if (page === 'home') setTimeout(renderStudioPulseHome, 0);
        return out;
      };
    }

    setTimeout(() => {
      try { if (document.getElementById('page-home')?.classList.contains('active')) renderStudioPulseHome({ immediate:true }); } catch(e){}
    }, 0);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearSparkTimer();
      else if (document.getElementById('page-home')?.classList.contains('active')) scheduleSparkPulse();
    });
  }

  install();
})();

(function(){
  if (window.__STUDIO_PULSE_V400_HELPERS__) return;
  window.__STUDIO_PULSE_V400_HELPERS__ = true;

  function clone(value){
    try { return JSON.parse(JSON.stringify(value)); }
    catch (err) { return value; }
  }

  function ensurePersonhoodFlags(){
    window.STATE = window.STATE || {};
    STATE.personhood = STATE.personhood || {};
    STATE.personhood.config = Object.assign({
      consciousnessLayerActive: true,
      voiceLibraryReady: true,
      debugMode: false
    }, STATE.personhood.config || {});
  }

  function buildPulseRoomState(){
    ensurePersonhoodFlags();
    const ai = STATE.aiCommsCenter || {};
    const personhood = STATE.personhood || {};
    const characters = {};
    Object.keys(personhood.liveState || {}).forEach((id) => {
      const memories = (((personhood.salienceMemory || {})[id] || {}).memories || [])
        .slice()
        .sort((a, b) => Number(b.emotionalWeight || 0) - Number(a.emotionalWeight || 0))
        .slice(0, 3);
      const live = (personhood.liveState || {})[id] || {};
      characters[id] = {
        liveState: clone(live),
        holdingState: clone((personhood.holding || {})[id] || {}),
        recentObservations: clone(((personhood.peerObservations || {})[id] || []).slice(-4)),
        topMemories: clone(memories),
        autonomousQueue: clone(((personhood.autonomyQueue || {})[id] || []).slice(0, 3)),
        liveScores: {
          mood: live.currentMood,
          patience: live.patience,
          warmth: live.warmth,
          curiosity: live.curiosity,
          irritation: live.irritation,
          urgeToDefend: live.urgeToDefend,
          urgeToTease: live.urgeToTease,
          needToBeSeen: live.needToBeSeen
        }
      };
    });
    return {
      rhythm: clone(personhood.conversationRhythm || {
        pace: ai.roomMode || 'moderate',
        consecutiveShortTurns: 0,
        consecutiveLongTurns: 0,
        lastLongPauseTurn: 0,
        currentBuildMomentum: 0.3,
        totalTurns: 0
      }),
      target: ai.target || 'studio',
      activeThreadId: ai.activeThreadId || '',
      consciousness: clone(personhood.config || {}),
      characters
    };
  }

  function softenThinkingCards(root){
    const scope = root && root.querySelectorAll ? root : document;
    const cards = scope.querySelectorAll('.sp-voice-card.is-thinking');
    cards.forEach((card) => {
      if (card.dataset.v400Softened === '1') return;
      card.dataset.v400Softened = '1';
      const label = card.querySelector('.who span');
      if (label) label.textContent = 'Room · thinking';
    });
  }

  function installThinkingObserver(){
    softenThinkingCards(document);
    if (window.__STUDIO_PULSE_V400_OBSERVER__) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node && node.nodeType === 1) softenThinkingCards(node);
        });
      });
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    window.__STUDIO_PULSE_V400_OBSERVER__ = observer;
  }

  window.getPulseRoomState = buildPulseRoomState;
  window.__pulseConsciousnessVersion = 'studio_pulse_v400';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      ensurePersonhoodFlags();
      installThinkingObserver();
    }, { once:true });
  } else {
    ensurePersonhoodFlags();
    installThinkingObserver();
  }
})();
