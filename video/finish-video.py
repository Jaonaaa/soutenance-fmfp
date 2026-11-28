from pathlib import Path
import cv2,numpy as np,subprocess
cv2.setNumThreads(2)
src='video/out/Demo_FMFP-scrolls.mp4'
cap=cv2.VideoCapture(src);fps=cap.get(cv2.CAP_PROP_FPS);count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
plan=cv2.imread('video/out/transitions/03-plan-annuel.png')
base=163.933333
refinement = {
    name: cv2.imread('video/out/transitions/refinement-' + name + '.png')
    for name in ('panel', 'rubric', 'editor', 'saved')
}
evidence = {name: cv2.imread('video/out/transitions/evaluation-' + name + '.png') for name in ('neutral', 'analysis', 'evidence')}
output='video/out/Demo_FMFP-final-scrolls.mp4'
enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','1600x900','-r',str(fps),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output],stdin=subprocess.PIPE)
for i in range(count):
 ok,f=cap.read()
 if not ok:raise RuntimeError('Missing frame')
 t=i/fps-base
 if 44.1<=t<48:
  f[222:726,217:789]=plan[222:726,217:789]
 # Scroll the detail areas without moving the app's fixed controls.
 evidence_scroll_distance=0
 for start,end,pixels,x,y,w,h in [(37.5,44.1,260,300,110,1215,770),(99.5,110,180,820,285,690,595)]:
  if start<=t<end:
   progress=min(1,(t-start)/.85)
   distance=round(pixels*progress*progress*(3-2*progress))
   if x==300:
    evidence_scroll_distance=distance
   sticky=f[810:875,1340:1530].copy() if x==300 else None
   panel=f[y:y+h,x:x+w].copy()
   f[y:y+h-distance,x:x+w]=panel[distance:]
   f[y+h-distance:y+h,x:x+w]=[252,252,252]
   if x==300:
    # Remove the shifted copy of the floating control before pinning it back.
    moved_top=810-distance
    f[moved_top:moved_top+65,1340:1530]=[252,252,252]
    # Keep the floating review action anchored to the viewport bottom.
    f[810:875,1340:1530]=sticky
   elif 107.0 <= t < 110:
    # Finish the compare card's highlight where the original viewport clipped it.
    cv2.line(f,(832,681),(1494,681),(80,126,37),2)
    cv2.line(f,(832,675),(832,681),(80,126,37),2)
    cv2.line(f,(1494,675),(1494,681),(80,126,37),2)
 if 37.5 <= t < 44.1:
  state='neutral' if t<38.35 else ('analysis' if t<40.9 else 'evidence')
  patch=evidence[state]
  patch_y=695-evidence_scroll_distance
  patch_bottom=min(900,patch_y+patch.shape[0])
  f[patch_y:patch_bottom,307:1513] = patch[:patch_bottom-patch_y]
  if evidence_scroll_distance < 260:
   # The panel moves with the page; restore the fixed action above its lower edge.
   f[810:875,1340:1530]=sticky
 for start,end,name,x,y in [
     (141.53,151.2,'panel',954,31),
     (158.0,162.3,'editor',470,343),
     (165.16,174.1,'saved',1220,551),
 ]:
  if start<=t<end:
   patch=refinement[name]
   height=min(patch.shape[0],900-y)
   f[y:y+height,x:x+patch.shape[1]]=patch[:height]
 enc.stdin.write(f.tobytes())
enc.stdin.close()
if enc.wait():raise RuntimeError('Encode failed')
print(output)
