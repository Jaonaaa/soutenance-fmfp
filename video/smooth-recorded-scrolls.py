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
rubric_field = cv2.imread('video/out/transitions/refinement-rubric.png')
rubric_scrolled = cv2.imread('video/out/transitions/refinement-rubric-scrolled.png')
cap.set(cv2.CAP_PROP_POS_FRAMES, round(319 * fps))
ok, scrolled_reference = cap.read()
if not ok:
    raise RuntimeError('Missing post-scroll frame for the rubric reflow')
orb = cv2.ORB_create(nfeatures=1800, fastThreshold=12)
matcher = cv2.BFMatcher(cv2.NORM_HAMMING)

def prepare_frame(frame, t):
    if not 315.13 <= t < 321.9:
        return frame
    scroll = 253 if t >= 318.5 else 0
    x, width = 681, rubric_field.shape[1]
    field_y = 302 - scroll
    next_section_y = 538 - scroll
    source_end = 856
    move = 144
    original = frame.copy()
    source_start = next_section_y
    destination_start = source_start - move
    destination_end = source_end - move
    frame[destination_start:destination_end, x:x+width] = original[source_start:source_end, x:x+width]
    frame[field_y+rubric_field.shape[0]:destination_start, x:x+width] = (255, 255, 255)
    frame[destination_end:source_end, x:x+width] = (255, 255, 255)
    if scroll == 0:
        frame[destination_end:source_end, x:x+width] = scrolled_reference[603:747, x:x+width]
    patch = rubric_field if field_y >= 120 else rubric_scrolled
    visible_top = max(110, field_y)
    visible_bottom = min(source_end, field_y + patch.shape[0])
    if visible_top < visible_bottom:
        patch_start = visible_top - field_y
        frame[visible_top:visible_bottom, x:x+width] = patch[patch_start:patch_start+visible_bottom-visible_top]
    return frame

def read(t):
    cap.set(cv2.CAP_PROP_POS_FRAMES, round(t * fps))
    ok, frame = cap.read()
    if not ok:
        raise RuntimeError(f'Missing frame at {t}')
    return prepare_frame(frame, t)

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
# This evaluator-page scroll was not picked up by feature detection, but it is visible in the recording.
if not any(318.0 <= event['t'] <= 319.0 for event in events):
    events.append({'t':318.5, 'dy':-253, 'matches':0})
events.sort(key=lambda event: event['t'])
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
    manual=any(abs(t-318.5)<.01 for t in group)
    region=(275,195,1280,685) if start<164 else (300,110,1215,745)
    if manual:
        # The evaluator summary is fixed; only the rubric column scrolls.
        region=(681,110,819,745)
    x,y,w,h=region
    times=np.linspace(start,end,max(3,round((end-start)*15)))
    frames=[read(t) for t in times]
    if manual:
        offsets=[0 if t<318.5 else 253 for t in times]
    else:
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
    frame=prepare_frame(frame,index/fps)
    for begin,finish,a,b,panorama,origin,distance,region in transitions:
        if begin<=index<finish:
            t=(index-begin)/max(1,finish-begin-1)
            eased=t*t*(3-2*t)
            x,y,w,h=region
            position=round(origin+distance*eased)
            frame[y:y+h,x:x+w]=panorama[position:position+h]
            break
    t=index/fps
    if 318.65 <= t < 321.9:
        # Clear the proposal as it passes under the fixed panel header.
        frame[95:165,681:1500]=(255,255,255)
    encoder.stdin.write(frame.tobytes())
encoder.stdin.close()
if encoder.wait():
    raise RuntimeError('Video encoding failed')
print(output,flush=True)
