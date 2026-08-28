"""
Assembles the crew from each agent's own file. This module doesn't define
any identity itself -- it just knows where each one lives.
"""

from . import huey, marlowe, wren, dot, castor, basalt

BUILDERS = {
    huey.NAME: huey.build_agent,
    marlowe.NAME: marlowe.build_agent,
    wren.NAME: wren.build_agent,
    dot.NAME: dot.build_agent,
    castor.NAME: castor.build_agent,
    basalt.NAME: basalt.build_agent,
}
