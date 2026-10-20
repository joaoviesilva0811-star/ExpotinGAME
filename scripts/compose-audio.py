"""Original procedural score and Foley. Requires Python/numpy and FFmpeg to rebuild;
pre-rendered Ogg files ship with the game, so players need neither tool.
"""
import numpy as np
import wave, subprocess
from pathlib import Path
SR=32000
OUT=Path(__file__).resolve().parent.parent/'public/assets/audio'
OUT.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(47191)
def freq(midi):return 440*2**((midi-69)/12)
def voice(midi,duration,instrument):
 t=np.arange(int(duration*SR))/SR;f=freq(midi);attack=.06;release=.2
 if instrument=='lute':
  wave=sum(np.sin(2*np.pi*f*k*t)*np.exp(-t*(2+k*.6))/k for k in range(1,6));attack=.006;release=.08
 elif instrument=='strings':
  wave=sum((np.sin(2*np.pi*f*k*t+.008*np.sin(t*26))+np.sin(2*np.pi*f*k*1.002*t))/(k*4) for k in range(1,6));attack=.18;release=.4
 elif instrument=='horn':
  wave=sum(np.sin(2*np.pi*f*k*t+.018*np.sin(t*19))/k for k in range(1,8))*np.exp(-t*.24);attack=.035;release=.18
 elif instrument=='choir':
  wave=(np.sin(2*np.pi*f*t)*.7+np.sin(2*np.pi*f*2*t)*.2+np.sin(2*np.pi*f*3*t)*.12)*(1+np.sin(t*4)*.04);attack=.35;release=.5
 elif instrument=='bell':
  wave=(np.sin(2*np.pi*f*t)+np.sin(2*np.pi*f*2.76*t)*.3+np.sin(2*np.pi*f*4.1*t)*.08)*np.exp(-t*2);attack=.003
 else:
  wave=np.sin(2*np.pi*f*t)+np.sin(2*np.pi*f*2*t)*.18;attack=.018
 env=np.minimum(1,t/attack)*np.minimum(1,(duration-t)/release)
 return wave*env

def write(name,sound):
 sound=np.tanh(sound*.85);peak=np.max(np.abs(sound));sound*=.82/max(.82,peak)
 raw=Path('/tmp/iron-'+name+'.wav')
 with wave.open(str(raw),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((sound*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(raw),*(['-af','loudnorm=I=-16:TP=-1.5:LRA=9'] if name.startswith('battle-') or name=='menu' else []),'-c:a','libvorbis','-q:a','4',str(OUT/(name+'.ogg'))],check=True)
 raw.unlink()

def compose(name,bpm,root,battle=False,variation=0):
 beat=60/bpm;bars=24 if battle else 32;duration=bars*4*beat;n=int(duration*SR);mix=np.zeros((n,2),dtype=np.float32)
 def put(signal,start,volume=.15,pan=0):
  offset=int(start*SR);indexes=(np.arange(len(signal))+offset)%n
  mix[indexes,0]+=signal*volume*(1-pan)*.7;mix[indexes,1]+=signal*volume*(1+pan)*.7
 progression=[0,-5,-2,-7,0,3,-5,-2]
 melody=([12,19,15,14,12,7,10,12,15,19,22,19,17,15,14,12] if not battle else [[0,7,12,10,7,3,2,0,0,7,15,14,12,10,7,0],[12,15,17,19,17,15,12,10,12,19,22,19,17,15,14,12],[0,1,7,12,13,12,7,6,0,7,13,19,18,13,12,7]][variation])
 for bar in range(bars):
  chord=root+progression[bar%8];start=bar*4*beat
  for interval in [0,7,12,15]:put(voice(chord+interval,beat*4+.6,'choir' if not battle else 'strings'),start,.12 if not battle else .1,(interval-7)/28)
  for b in range(4):
   put(voice(chord-12,beat*(.8 if battle else 2),'bass'),start+b*beat,.2 if battle else .1)
   arp=[0,7,12,15,19,15,12,7]
   for half in range(2):put(voice(chord+arp[(b*2+half+variation)%8]+12,beat*.8,'lute'),start+(b+half*.5)*beat,.095 if battle else .075,(-1 if half else 1)*.3)
   if battle:
    t=np.arange(int(.34*SR))/SR
    drum=np.sin(2*np.pi*(57*t+17*(1-np.exp(-t*22))))*np.exp(-t*15)+rng.normal(0,.1,len(t))*np.exp(-t*50)
    if b in [0,2] or variation==2:put(drum,start+b*beat,.35)
    noise=rng.normal(0,1,int(.1*SR));noise=np.diff(noise,prepend=0)*np.exp(-np.arange(len(noise))/SR*45)
    put(noise,start+(b+.5)*beat,.035,.35)
    if b in [1,3]:put(noise,start+b*beat,.1,-.2)
  if bar>=0:
   for k in range(2 if battle else 1):
    note=root+melody[(bar*2+k+variation*3)%len(melody)]
    put(voice(note,beat*(1.7 if battle else 3.3),('horn' if variation==0 else 'lute' if variation==1 else 'choir') if battle else 'bell'),start+k*2*beat,.22 if battle else .18,-.15)
 # Signature low drums / bells make the main motif recognizable immediately.
 for bar in range(0,bars,4):
  start=bar*4*beat
  put(voice(root+(0 if battle else 24),beat*3,'horn' if battle else 'bell'),start,.18 if battle else .12,.1)
  if battle:
   for off in [0,.75,1.5,2.5,3.5]:
    t=np.arange(int(.55*SR))/SR
    drum=np.sin(2*np.pi*(43*t+1.2*(1-np.exp(-t*24))))*np.exp(-t*9)
    put(drum,start+off*beat,.42)
 # Stereo room reflections wrap seamlessly around the loop boundary.
 dry=mix.copy()
 for delay,gain in [(.17,.14),(.29,.11),(.43,.08),(.71,.06)]:mix+=np.roll(dry,int(delay*SR),axis=0)[:,::-1]*gain
 write(name,mix)
for args in [('menu',78,50,False,0),('battle-throne',108,38,True,0),('battle-forest',114,41,True,1),('battle-void',120,37,True,2)]:
 compose(*args);print('Composed',args[0],flush=True)

def effect(name,duration,kind):
 t=np.arange(int(duration*SR))/SR;noise=rng.normal(0,1,len(t));smooth=np.convolve(noise,np.ones(9)/9,mode='same')
 if kind=='slash':signal=(noise-smooth)*np.sin(np.pi*np.minimum(1,t/duration))**2*np.exp(-t*9)*.5
 elif kind=='arrow':signal=(noise-smooth)*np.exp(-t*22)*.3+np.sin(2*np.pi*(900*t-600*t*t))*np.exp(-t*27)*.17
 elif kind=='hit':signal=smooth*np.exp(-t*35)*1.8+np.sin(2*np.pi*(95*t-45*t*t))*np.exp(-t*16)*.65
 elif kind=='block':signal=sum(np.sin(2*np.pi*f*t)*np.exp(-t*(7+i*5))*.22 for i,f in enumerate([714,1127,1959,2691]))+noise*np.exp(-t*70)*.15
 elif kind=='dash':signal=(noise-smooth)*np.sin(np.pi*t/duration)*np.exp(-t*4)*.32
 else:
  f=[47,65,38][int(kind)];phase=2*np.pi*(f*t+6*np.sin(t*3))+np.sin(t*24)*1.5
  signal=(np.sin(phase)*.42+np.sin(phase*1.49)*.2+smooth*.5)*(np.minimum(1,t/.14))*np.maximum(0,1-t/duration)**.7*(.7+np.sin(t*19)**2*.3)
 stereo=np.column_stack([signal,signal]);write(name,stereo)
for name,duration,kind in [('slash',.32,'slash'),('arrow',.25,'arrow'),('hit',.25,'hit'),('block',.55,'block'),('dash',.34,'dash'),('roar-0',1.6,'0'),('roar-1',1.9,'1'),('roar-2',2.1,'2')]:effect(name,duration,kind)
print('Original score and effects exported.')
