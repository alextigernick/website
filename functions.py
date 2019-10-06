import os,inspect
#site_root = os.path.dirname(os.path.abspath(inspect.stack()[0][1]))
def list_dir(x):
    output = ""
    for each in sorted(os.listdir(site_root+x)):
        if os.path.isdir(os.path.join(site_root+x, each)):
            output += "<a href='{}/'/><p>{}</p></a>".format(os.path.join(x,each),each)
    return output