import json, sys
sys.path.insert(0,'/home/claude/dvor/tools')
import world_def as wd
out={'walk':{k:[[int(x),int(y)] for x,y in v] for k,v in wd.WALK.items()},
     'sand':wd.SAND,
     'block':{k:[[int(x),int(y)] for x,y in v] for k,v in wd.BLOCK.items()},
     'fences':{k:{'pts':[[int(x),int(y)] for x,y in f['pts']],'h':f['h']} for k,f in wd.FENCES.items()}}
json.dump(out,open('/home/claude/dvor/build/world.json','w'),separators=(',',':'))
print(len(json.dumps(out)))
