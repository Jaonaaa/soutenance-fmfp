"""Rebuild vertical scroll transitions from overlapping recorded frames."""
import json
import subprocess
from pathlib import Path
import cv2
import numpy as np

cv2.setNumThreads(2)
# Start from the untouched full timeline so rerenders never smooth an already
# composited frame a second time.
source = Path('video/out/Demo_FMFP-avant-scrolls.mp4')
cap = cv2.VideoCapture(str(source))
fps = cap.get(cv2.CAP_PROP_FPS)
count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
orb = cv2.ORB_create(nfeatures=1800, fastThreshold=12)
matcher = cv2.BFMatcher(cv2.NORM_HAMMING)

def read(t):
    cap.set(cv2.CAP_PROP_POS_FRAMES, round(t * fps))
    ok, frame = cap.read()
    if not ok:
        raise RuntimeError(f'Missing frame at {t}')
    return frame

def displacement(a, b, region):
    x,y,w,h=region
    key_a, desc_a = orb.detectAndCompute(cv2.cvtColor(a[y:y+h,x:x+w],cv2.COLOR_BGR2GRAY),None)
    key_b, desc_b = orb.detectAndCompute(cv2.cvtColor(b[y:y+h,x:x+w],cv2.COLOR_BGR2GRAY),None)
    if desc_a is None or desc_b is None:
        return 0
    pairs=matcher.knnMatch(desc_a,desc_b,k=2)
    good=[m for pair in pairs if len(pair)==2 for m,n in [pair] if m.distance < .65*n.distance]
    if len(good)<15:
        return 0
    shifts=np.array([np.array(key_b[m.trainIdx].pt)-key_a[m.queryIdx].pt for m in good])
    dx,dy=np.median(shifts,axis=0)
    if abs(dx)>2 or (np.linalg.norm(shifts-[dx,dy],axis=1)<3).sum()<15:
        return 0
    return int(round(dy))

events=[event for event in json.loads(Path('video/out/scroll-events.json').read_text()) if event['t'] < 328.5]
groups=[]
for event in events:
    t=event['t']
    if groups and t-groups[-1][-1]<.65:
        groups[-1].append(t)
    else:
        groups.append([t])
transitions=[]
for group in groups:
    start=max(0,group[0]-.4)
    end=min(count/fps,group[-1]+.45)
    region=(275,195,1280,685) if start<164 else (300,110,1215,745)
    x,y,w,h=region
    times=np.linspace(start,end,max(3,round((end-start)*15)))
    frames=[read(t) for t in times]
    offsets=[0]
    for a,b in zip(frames,frames[1:]):
        offsets.append(offsets[-1]-displacement(a,b,region))
    distance=offsets[-1]
    if abs(distance)<55:
        continue
    low=min(offsets);high=max(offsets)
    panorama=np.full((h+high-low,w,3),246,np.uint8)
    # Earlier frames own overlap to keep static form text crisp.
    for frame,offset in reversed(list(zip(frames,offsets))):
        top=offset-low
        panorama[top:top+h]=frame[y:y+h,x:x+w]
    begin=round(start*fps);finish=round(end*fps)
    transitions.append((begin,finish,frames[0],frames[-1],panorama,-low,distance,region))
    print(f'Scroll {start:.2f}–{end:.2f}, {distance}px',flush=True)

output=Path('video/out/Demo_FMFP-scrolls.mp4')
encoder=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s','1600x900','-r',str(fps),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(output)],stdin=subprocess.PIPE)
cap.set(cv2.CAP_PROP_POS_FRAMES,0)
for index in range(count):
    ok,frame=cap.read()
    if not ok:
        raise RuntimeError('Unexpected end of source')
    for begin,finish,a,b,panorama,origin,distance,region in transitions:
        if begin<=index<finish:
            t=(index-begin)/max(1,finish-begin-1)
            eased=t*t*(3-2*t)
            x,y,w,h=region
            position=round(origin+distance*eased)
            frame[y:y+h,x:x+w]=panorama[position:position+h]
            break
    encoder.stdin.write(frame.tobytes())
encoder.stdin.close()
if encoder.wait():
    raise RuntimeError('Video encoding failed')
print(output,flush=True)
