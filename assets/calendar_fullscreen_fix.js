(function(){
  function plannerNeedsRender(page, grid){
    if(!page || !grid || !page.classList.contains('active')) return false;
    var view = (window.STATE && window.STATE.plannerView) === 'month' ? 'month' : 'week';
    var hasWeek = !!grid.querySelector('.day-col');
    var hasMonth = !!grid.querySelector('.month-cell');
    if(view === 'month') return !hasMonth || !grid.classList.contains('planner-month-board');
    return !hasWeek || !grid.classList.contains('planner-week-agenda');
  }

  function healPlannerRender(){
    var page=document.getElementById('page-planner');
    var grid=document.getElementById('planner-grid');
    if(!plannerNeedsRender(page, grid)) return;
    if(typeof window.renderPlanner === 'function'){
      try{ window.renderPlanner(); }catch(err){ console.warn('planner heal render failed', err); }
    }
  }

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
      grid.style.width='100%';
      grid.style.maxWidth='none';
      grid.style.minWidth='0';
    }
  }

  var run=function(){ requestAnimationFrame(function(){ healPlannerRender(); applyPlannerWidth(); }); };
  window.addEventListener('load', run);
  window.addEventListener('resize', run);
  window.addEventListener('hashchange', run);
  document.addEventListener('click', function(e){
    var t=e.target;
    if(!t) return;
    if(
      t.id==='planner-month-chip'
      || t.id==='planner-week-chip'
      || (t.closest && t.closest('#planner-view-toggle'))
      || (t.closest && t.closest('[data-page="planner"]'))
    ){
      setTimeout(run, 40);
    }
  });
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
