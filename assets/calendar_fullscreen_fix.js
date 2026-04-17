(function(){
  function applyPlannerWidth(){
    var page=document.getElementById('page-planner');
    var main=document.getElementById('main');
    var grid=document.getElementById('planner-grid');
    if(!page||!main||!grid) return;

    page.style.maxWidth='none';
    page.style.width='auto';

    var mainRect=main.getBoundingClientRect();
    var desired=Math.max(0, Math.floor(mainRect.width - 24));
    page.style.minWidth='0';
    page.style.width=desired ? desired+'px' : 'auto';

    if(grid.classList.contains('month-grid')){
      grid.style.display='grid';
      grid.style.gridTemplateColumns='repeat(7,minmax(0,1fr))';
      grid.style.width='100%';
      grid.style.maxWidth='none';
      grid.style.minWidth='0';
    }
  }

  var run=function(){ requestAnimationFrame(applyPlannerWidth); };
  window.addEventListener('load', run);
  window.addEventListener('resize', run);
  window.addEventListener('hashchange', run);
  document.addEventListener('click', function(e){
    var t=e.target;
    if(!t) return;
    if(t.id==='planner-month-chip' || t.id==='planner-week-chip' || t.closest && t.closest('#planner-view-toggle')){
      setTimeout(run, 40);
    }
  });
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
