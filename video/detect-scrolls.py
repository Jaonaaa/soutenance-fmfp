import cv2, numpy as np, json
cap=cv2.VideoCapture('exports/final/Demo_FMFP.mp4')
orb=cv2.ORB_create(nfeatures=1400,fastThreshold=12)
matcher=cv2.BFMatcher(cv2.NORM_HAMMING)
def features(frame):
 g=cv2.cvtColor(frame[190:880,280:1100],cv2.COLOR_BGR2GRAY)
 return orb.detectAndCompute(g,None)
def shift(a,b):
 ka,da=features(a);kb,db=features(b)
 if da is None or db is None:return None
 pairs=matcher.knnMatch(da,db,k=2)
 good=[m for m,n in pairs if m.distance<.65*n.distance]
 if len(good)<20:return None
 dis=np.array([np.array(kb[m.trainIdx].pt)-ka[m.queryIdx].pt for m in good])
 med=np.median(dis,axis=0)
 support=np.linalg.norm(dis-med,axis=1)<3
 if support.sum()<20 or support.mean()<.6 or abs(med[0])>2:return None
 return float(med[1]),int(support.sum())
events=[];prev=None; idx=0
while True:
 ok,frame=cap.read()
 if not ok:break
 if idx%3==0:
  if prev is not None:
   s=shift(prev,frame)
   if s and abs(s[0])>60:
    events.append({'t':round(idx/30,3),'dy':round(s[0],1),'matches':s[1]})
  prev=frame
 idx+=1
json.dump(events,open('video/out/scroll-events.json','w'),indent=2)
print(json.dumps(events,indent=2))
