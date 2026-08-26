import fs from 'fs';

let content = fs.readFileSync('components/admin/ScheduleDetailsModal.tsx', 'utf8');

const regex1 = /<div className="flex flex-wrap gap-1">\s*\{\(c\.allDates \|\| \[\]\)\.map\(\(date: string, dIdx: number\) => \{\s*const hasConflict = \(c\.teacherIds \|\| \[\]\)\.some\(\(tid: string\) => getConflict\(tid, date, c\)\);\s*if \(hasConflict\) return \(\s*<div key=\{`\$\{date\}-\$\{dIdx\}`\} className="text-\[9px\] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-1\.5 py-0\.5 rounded border border-red-100">\s*<AlertTriangle className="w-2\.5 h-2\.5" \/> Conflito \{date \? format\(parseISO\(date\), 'dd\/MM'\) : ''\}\s*<\/div>\s*\);\s*return null;\s*\}\)\}\s*<\/div>/;

const regex2 = /<div className="flex flex-wrap gap-1 pl-1">\s*\{\(c\.allDates \|\| \[\]\)\.map\(\(date: string, dIdx: number\) => \{\s*const hasConflict = \(c\.teacherIds \|\| \[\]\)\.some\(\(tid: string\) => getConflict\(tid, date, c\)\);\s*if \(hasConflict\) return \(\s*<div key=\{`\$\{date\}-\$\{dIdx\}`\} className="text-\[9px\] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-1\.5 py-0\.5 rounded border border-red-100">\s*<AlertTriangle className="w-2\.5 h-2\.5" \/> Conflito \{date \? format\(parseISO\(date\), 'dd\/MM'\) : ''\}\s*<\/div>\s*\);\s*return null;\s*\}\)\}\s*<\/div>/;

const replacement1 = `<div className="flex flex-wrap gap-1">
                                              {(c.allDates || []).map((date: string, dIdx: number) => {
                                                const conflitos = (c.teacherIds || [])
                                                  .map((tid: string) => getConflict(tid, date, c))
                                                  .filter(Boolean);
                                                if (conflitos.length === 0) return null;
                                                const isAllLocal = conflitos.every((conf: any) => conf?.type === 'local');
                                                return (
                                                  <div 
                                                    key={\`\${date}-\${dIdx}\`} 
                                                    className={\`text-[9px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border \${
                                                      isAllLocal 
                                                        ? 'text-amber-700 bg-amber-50 border-amber-200' 
                                                        : 'text-red-600 bg-red-50 border-red-200'
                                                    }\`}
                                                    title={conflitos.map((conf: any) => conf?.info).join(' · ')}
                                                  >
                                                    <AlertTriangle className={\`w-2.5 h-2.5 shrink-0 \${isAllLocal ? 'text-amber-600' : 'text-red-600'}\`} />
                                                    <span>
                                                      Conflito {date ? format(parseISO(date), 'dd/MM') : ''}: {conflitos[0]?.info}
                                                      {conflitos.length > 1 ? \` (+\${conflitos.length - 1})\` : ''}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>`;

const replacement2 = `<div className="flex flex-wrap gap-1 pl-1">
                                              {(c.allDates || []).map((date: string, dIdx: number) => {
                                                const conflitos = (c.teacherIds || [])
                                                  .map((tid: string) => getConflict(tid, date, c))
                                                  .filter(Boolean);
                                                if (conflitos.length === 0) return null;
                                                const isAllLocal = conflitos.every((conf: any) => conf?.type === 'local');
                                                return (
                                                  <div 
                                                    key={\`\${date}-\${dIdx}\`} 
                                                    className={\`text-[9px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border \${
                                                      isAllLocal 
                                                        ? 'text-amber-700 bg-amber-50 border-amber-200' 
                                                        : 'text-red-600 bg-red-50 border-red-200'
                                                    }\`}
                                                    title={conflitos.map((conf: any) => conf?.info).join(' · ')}
                                                  >
                                                    <AlertTriangle className={\`w-2.5 h-2.5 shrink-0 \${isAllLocal ? 'text-amber-600' : 'text-red-600'}\`} />
                                                    <span>
                                                      Conflito {date ? format(parseISO(date), 'dd/MM') : ''}: {conflitos[0]?.info}
                                                      {conflitos.length > 1 ? \` (+\${conflitos.length - 1})\` : ''}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>`;

console.log('Regex1 match:', regex1.test(content));
console.log('Regex2 match:', regex2.test(content));

content = content.replace(regex1, replacement1);
content = content.replace(regex2, replacement2);

fs.writeFileSync('components/admin/ScheduleDetailsModal.tsx', content, 'utf8');
console.log('Patched ScheduleDetailsModal.tsx successfully!');
