/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  Trash2, 
  Edit2,
  ChevronLeft, 
  ChevronRight,
  GripVertical,
  X
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  isSameDay, 
  parse, 
  addMinutes, 
  differenceInMinutes,
  startOfDay,
  eachDayOfInterval,
  endOfWeek
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Course, ScheduledSlot, COURSE_COLORS, PreferredSlot } from './types';

const DAYS = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 0 },
];

const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const totalMinutes = i * 30;
  const hour = Math.floor(totalMinutes / 60) + 8; // 8:00 to 21:00
  const minute = totalMinutes % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [scheduledSlots, setScheduledSlots] = useState<ScheduledSlot[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    name: '',
    grade: '',
    type: '面授',
    totalSections: 1,
    duration: 1.5,
    color: COURSE_COLORS[0],
    preferredSlots: [],
    recurrence: 'none'
  });

  const [editingSlot, setEditingSlot] = useState<ScheduledSlot | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<{ date: Date; time: string } | null>(null);

  const hasConflict = useCallback((date: Date, startTime: string, duration: number, excludeSlotId?: string, excludeCourseId?: string) => {
    const getMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const startMin = getMinutes(startTime);
    const endMin = startMin + Math.round(duration * 60);
    const dateStr = format(date, 'yyyy-MM-dd');

    const conflict = scheduledSlots.find(slot => {
      // Skip if it's the same slot we're editing
      if (excludeSlotId && slot.id === excludeSlotId) return false;
      
      // Skip if it's the same course (as requested: "不用跟当前拖动的课程做冲突避免")
      if (excludeCourseId && slot.courseId === excludeCourseId) return false;
      
      // Only check slots on the same day
      const slotDateStr = format(slot.date, 'yyyy-MM-dd');
      if (slotDateStr !== dateStr) return false;

      const slotStartMin = getMinutes(slot.startTime);
      const slotEndMin = getMinutes(slot.endTime);

      // Overlap check: (StartA < EndB) && (EndA > StartB)
      return startMin < slotEndMin && endMin > slotStartMin;
    });

    if (conflict) {
      console.log('[Conflict] New:', { date: dateStr, start: startTime, duration, endMin }, 'Existing:', conflict);
      return true;
    }
    return false;
  }, [scheduledSlots]);

  const openCreateDialog = () => {
    setEditingCourseId(null);
    setNewCourse({
      name: '',
      grade: '',
      type: '面授',
      totalSections: 1,
      duration: 1.5,
      color: COURSE_COLORS[0],
      preferredSlots: [],
      recurrence: 'none'
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourseId(course.id);
    setNewCourse({ ...course });
    setIsDialogOpen(true);
  };

  const addPreferredSlot = () => {
    setNewCourse(prev => ({
      ...prev,
      preferredSlots: [...(prev.preferredSlots || []), { dayOfWeek: 1, startTime: '08:00' }]
    }));
  };

  const removePreferredSlot = (index: number) => {
    setNewCourse(prev => ({
      ...prev,
      preferredSlots: prev.preferredSlots?.filter((_, i) => i !== index)
    }));
  };

  const updatePreferredSlot = (index: number, field: keyof PreferredSlot, value: any) => {
    setNewCourse(prev => ({
      ...prev,
      preferredSlots: prev.preferredSlots?.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  // Calendar logic
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  });

  const handleSaveCourse = () => {
    if (!newCourse.name || !newCourse.grade || !newCourse.type) return;
    
    const courseId = editingCourseId || Math.random().toString(36).substr(2, 9);
    const duration = Number(newCourse.duration) || 1.5;
    const totalSections = Number(newCourse.totalSections) || 1;
    const recurrence = newCourse.recurrence || 'none';

    // Auto-scheduling logic if recurrence is selected
    let autoSlots: ScheduledSlot[] = [];
    
    if (recurrence !== 'none') {
      // Find the base slots to repeat
      let baseSlots: { startTime: string; dayOfWeek?: number }[] = [];
      
      // Priority 1: If there are already scheduled slots for this course, use the first one as base
      const existingSlots = scheduledSlots.filter(s => s.courseId === courseId);
      if (existingSlots.length > 0) {
        // Sort by date and time to find the absolute first one
        const sortedExisting = [...existingSlots].sort((a, b) => {
          const dateCompare = a.date.getTime() - b.date.getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });
        const first = sortedExisting[0];
        baseSlots = [{ 
          startTime: first.startTime, 
          dayOfWeek: first.date.getDay() 
        }];
      } 
      // Priority 2: Use preferred slots from the form
      else if (newCourse.preferredSlots && newCourse.preferredSlots.length > 0) {
        baseSlots = newCourse.preferredSlots;
      }

      if (baseSlots.length > 0) {
        let tempDate = startOfDay(new Date());
        let sectionsCount = 0;
        const maxDate = addDays(tempDate, 730);

        // If we are using an existing slot as base, we should probably start from its date
        if (existingSlots.length > 0) {
          tempDate = startOfDay(existingSlots[0].date);
        }

        while (sectionsCount < totalSections && tempDate < maxDate) {
          const dayOfWeek = tempDate.getDay();
          
          // For daily, we use all base slots every day
          // For weekly, we only use slots that match the day of week
          const slotsForDay = recurrence === 'daily' 
            ? baseSlots 
            : baseSlots.filter(s => s.dayOfWeek === dayOfWeek);
          
          slotsForDay.sort((a, b) => a.startTime.localeCompare(b.startTime));

          for (const slot of slotsForDay) {
            if (sectionsCount >= totalSections) break;
            
            // Avoid duplicating the very first existing slot if we started from its date
            const isFirstExisting = existingSlots.length > 0 && 
                                   isSameDay(tempDate, existingSlots[0].date) && 
                                   slot.startTime === existingSlots[0].startTime;

            // Check for conflicts in auto-scheduling
            if (!isFirstExisting && hasConflict(tempDate, slot.startTime, duration, undefined, courseId)) {
              continue; // Skip conflicting slots in auto-scheduling
            }

            autoSlots.push({
              id: isFirstExisting ? existingSlots[0].id : Math.random().toString(36).substr(2, 9),
              courseId: courseId,
              date: new Date(tempDate),
              startTime: slot.startTime,
              endTime: format(addMinutes(parse(slot.startTime, 'HH:mm', new Date()), duration * 60), 'HH:mm')
            });
            sectionsCount++;
          }
          tempDate = addDays(tempDate, 1);
        }
      }
    }

    const courseData: Course = {
      id: courseId,
      name: newCourse.name!,
      grade: newCourse.grade!,
      type: newCourse.type as '在线' | '面授',
      totalSections: totalSections,
      remainingSections: recurrence !== 'none' ? totalSections - autoSlots.length : (editingCourseId 
        ? (courses.find(c => c.id === editingCourseId)?.remainingSections || totalSections)
        : totalSections),
      duration: duration,
      color: newCourse.color || COURSE_COLORS[0],
      preferredSlots: newCourse.preferredSlots,
      recurrence: recurrence
    };

    if (editingCourseId) {
      // Check for conflicts if duration or recurrence changed
      // We check all slots of this course against OTHER courses
      const courseSlots = scheduledSlots.filter(s => s.courseId === editingCourseId);
      const hasAnyConflict = courseSlots.some(s => 
        hasConflict(s.date, s.startTime, duration, s.id, editingCourseId)
      );

      // Also check auto-generated slots if recurrence is enabled
      const hasAutoConflict = autoSlots.some(s => 
        hasConflict(s.date, s.startTime, duration, undefined, editingCourseId)
      );

      if (hasAnyConflict || hasAutoConflict) {
        setConflictError('修改失败：该课程的某些课次与其他课程产生冲突。');
        setTimeout(() => setConflictError(null), 3000);
        return;
      }

      setCourses(courses.map(c => c.id === editingCourseId ? courseData : c));
      
      // Update all existing slots' endTime if duration changed, regardless of recurrence
      setScheduledSlots(prev => prev.map(s => {
        if (s.courseId === editingCourseId) {
          return {
            ...s,
            endTime: format(addMinutes(parse(s.startTime, 'HH:mm', new Date()), duration * 60), 'HH:mm')
          };
        }
        return s;
      }));

      if (recurrence !== 'none' && autoSlots.length > 0) {
        setScheduledSlots(prev => [
          ...prev.filter(s => s.courseId !== editingCourseId),
          ...autoSlots
        ]);
      }
    } else {
      setCourses([...courses, courseData]);
      if (autoSlots.length > 0) {
        setScheduledSlots(prev => [...prev, ...autoSlots]);
      }
    }

    setIsDialogOpen(false);
  };

  const handleUpdateSlotTime = (slotId: string, newStartTime: string) => {
    const slot = scheduledSlots.find(s => s.id === slotId);
    if (!slot) return;
    const course = courses.find(c => c.id === slot.courseId);
    if (!course) return;

    if (hasConflict(slot.date, newStartTime, course.duration, slotId, course.id)) {
      setConflictError('该时间段已有其他课程安排，请选择其他时间。');
      setTimeout(() => setConflictError(null), 3000);
      return;
    }

    const newEndTime = format(addMinutes(parse(newStartTime, 'HH:mm', new Date()), course.duration * 60), 'HH:mm');
    setScheduledSlots(prev => prev.map(s => s.id === slotId ? { ...s, startTime: newStartTime, endTime: newEndTime } : s));
    setEditingSlot(null);
  };

  const handleAddCourseToSlot = (courseId: string) => {
    if (!selectingSlot) return;
    const { date, time } = selectingSlot;
    const course = courses.find(c => c.id === courseId);
    
    if (course && course.remainingSections > 0) {
      if (hasConflict(date, time, course.duration, undefined, courseId)) {
        setConflictError('该时间段已有其他课程安排，请选择其他时间。');
        setTimeout(() => setConflictError(null), 3000);
        return;
      }

      const newSlot: ScheduledSlot = {
        id: Math.random().toString(36).substr(2, 9),
        courseId,
        date,
        startTime: time,
        endTime: format(addMinutes(parse(time, 'HH:mm', new Date()), course.duration * 60), 'HH:mm')
      };

      setScheduledSlots([...scheduledSlots, newSlot]);
      setCourses(courses.map(c => 
        c.id === courseId 
          ? { ...c, remainingSections: c.remainingSections - 1 } 
          : c
      ));
      setSelectingSlot(null);
    }
  };

  const handleDeleteCourse = (id: string) => {
    setCourses(courses.filter(c => c.id !== id));
    setScheduledSlots(scheduledSlots.filter(s => s.courseId !== id));
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'course' | 'slot') => {
    if (type === 'course') {
      const course = courses.find(c => c.id === id);
      if (!course || course.remainingSections <= 0) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('courseId', id);
    } else {
      e.dataTransfer.setData('slotId', id);
    }
  };

  const handleDrop = (e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault();
    const courseId = e.dataTransfer.getData('courseId');
    const slotId = e.dataTransfer.getData('slotId');
    
    if (courseId) {
      const course = courses.find(c => c.id === courseId);
      if (course && course.remainingSections > 0) {
        if (hasConflict(date, time, course.duration, undefined, courseId)) {
          setConflictError('该时间段已有其他课程安排，请选择其他时间。');
          setTimeout(() => setConflictError(null), 3000);
          return;
        }

        const newSlot: ScheduledSlot = {
          id: Math.random().toString(36).substr(2, 9),
          courseId,
          date,
          startTime: time,
          endTime: format(addMinutes(parse(time, 'HH:mm', new Date()), course.duration * 60), 'HH:mm')
        };

        setScheduledSlots([...scheduledSlots, newSlot]);
        setCourses(courses.map(c => 
          c.id === courseId 
            ? { ...c, remainingSections: c.remainingSections - 1 } 
            : c
        ));
      }
    } else if (slotId) {
      const slot = scheduledSlots.find(s => s.id === slotId);
      if (slot) {
        const course = courses.find(c => c.id === slot.courseId);
        if (course) {
          if (hasConflict(date, time, course.duration, slotId, course.id)) {
            setConflictError('该时间段已有其他课程安排，请选择其他时间。');
            setTimeout(() => setConflictError(null), 3000);
            return;
          }

          setScheduledSlots(scheduledSlots.map(s => 
            s.id === slotId 
              ? { 
                  ...s, 
                  date, 
                  startTime: time,
                  endTime: format(addMinutes(parse(time, 'HH:mm', new Date()), course.duration * 60), 'HH:mm')
                } 
              : s
          ));
        }
      }
    }
  };

  const handleRemoveSlot = (slotId: string) => {
    const slot = scheduledSlots.find(s => s.id === slotId);
    if (slot) {
      setScheduledSlots(scheduledSlots.filter(s => s.id !== slotId));
      setCourses(courses.map(c => 
        c.id === slot.courseId 
          ? { ...c, remainingSections: c.remainingSections + 1 } 
          : c
      ));
    }
  };

  const getSlotsForDayAndTime = (date: Date, time: string) => {
    return scheduledSlots.filter(s => 
      isSameDay(s.date, date) && s.startTime === time
    );
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-200 bg-white flex flex-col shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              课程安排系统
            </h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={openCreateDialog}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建新课程
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingCourseId ? '编辑课程' : '创建新课程'}</DialogTitle>
                <DialogDescription>
                  {editingCourseId ? '修改课程信息，系统将根据新的预设自动重新排课。' : '输入课程详细信息，开始您的教学计划。'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">课程名称</Label>
                  <Input 
                    id="name" 
                    placeholder="例如：高等数学" 
                    value={newCourse.name}
                    onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="grade">年级</Label>
                    <Select onValueChange={v => setNewCourse({...newCourse, grade: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择年级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="一年级">一年级</SelectItem>
                        <SelectItem value="二年级">二年级</SelectItem>
                        <SelectItem value="三年级">三年级</SelectItem>
                        <SelectItem value="四年级">四年级</SelectItem>
                        <SelectItem value="五年级">五年级</SelectItem>
                        <SelectItem value="六年级">六年级</SelectItem>
                        <SelectItem value="七年级">七年级</SelectItem>
                        <SelectItem value="八年级">八年级</SelectItem>
                        <SelectItem value="九年级">九年级</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">课程类型</Label>
                    <Select value={newCourse.type} onValueChange={v => setNewCourse({...newCourse, type: v as '在线' | '面授'})}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="在线">在线</SelectItem>
                        <SelectItem value="面授">面授</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>预设排课时间段</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={addPreferredSlot}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      添加
                    </Button>
                  </div>
                  <ScrollArea className={cn("border rounded-md bg-gray-50/50", (newCourse.preferredSlots?.length || 0) > 0 ? "h-[120px]" : "h-auto")}>
                    <div className="p-2 space-y-2">
                      {newCourse.preferredSlots?.length === 0 && (
                        <p className="text-[11px] text-gray-400 text-center py-2">无预设时间段</p>
                      )}
                      {newCourse.preferredSlots?.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-1.5 rounded border shadow-sm">
                          <Select 
                            value={slot.dayOfWeek.toString()} 
                            onValueChange={v => updatePreferredSlot(idx, 'dayOfWeek', parseInt(v))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS.map(d => (
                                <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={slot.startTime} 
                            onValueChange={v => updatePreferredSlot(idx, 'startTime', v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            onClick={() => removePreferredSlot(idx)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="recurrence">重复设置</Label>
                    <Select value={newCourse.recurrence} onValueChange={v => setNewCourse({...newCourse, recurrence: v as any})}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择重复方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不重复</SelectItem>
                        <SelectItem value="daily">每天重复</SelectItem>
                        <SelectItem value="weekly">每周重复</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration">课程时长 (小时)</Label>
                    <Select value={newCourse.duration?.toString()} onValueChange={v => setNewCourse({...newCourse, duration: parseFloat(v)})}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择时长" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 小时</SelectItem>
                        <SelectItem value="1.5">1.5 小时</SelectItem>
                        <SelectItem value="2">2 小时</SelectItem>
                        <SelectItem value="2.5">2.5 小时</SelectItem>
                        <SelectItem value="3">3 小时</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sections">总节次</Label>
                  <Input 
                    id="sections" 
                    type="number" 
                    min="1"
                    value={newCourse.totalSections}
                    onChange={e => setNewCourse({...newCourse, totalSections: parseInt(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>主题颜色</Label>
                  <div className="flex flex-wrap gap-2">
                    {COURSE_COLORS.map(color => (
                      <button
                        key={color}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          newCourse.color === color ? "border-black scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCourse({...newCourse, color})}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                <Button onClick={handleSaveCourse} className="bg-blue-600 hover:bg-blue-700">
                  {editingCourseId ? '更新课程' : '保存课程'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-2">
              我的课程 ({courses.length})
            </h2>
            {courses.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="bg-gray-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">暂无课程，请先创建一个课程。</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {courses.map(course => (
                  <motion.div
                    key={course.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    draggable={course.remainingSections > 0}
                    onDragStart={(e) => handleDragStart(e as any, course.id, 'course')}
                    className={cn(
                      "group relative p-4 rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md cursor-grab active:cursor-grabbing",
                      course.remainingSections === 0 && "opacity-50 cursor-not-allowed grayscale"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
                        <h3 className="font-semibold text-sm truncate max-w-[140px]">{course.name}</h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => openEditDialog(course)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                        {course.grade}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                        {course.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>时长: {course.duration} 小时</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>剩余: {course.remainingSections} / {course.totalSections} 节</span>
                        </div>
                      </div>
                      <GripVertical className="w-3 h-3 text-gray-300" />
                    </div>
                    {course.remainingSections > 0 && (
                      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-bottom border-gray-200 bg-white px-8 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">
              {format(weekStart, 'yyyy年MM月')}
            </h2>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-white hover:shadow-sm"
                onClick={() => setCurrentDate(addDays(currentDate, -7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                className="h-8 px-3 text-sm font-medium hover:bg-white hover:shadow-sm"
                onClick={() => setCurrentDate(new Date())}
              >
                今天
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-white hover:shadow-sm"
                onClick={() => setCurrentDate(addDays(currentDate, 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
              周视图
            </Badge>
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-8">
          <div className="min-w-[800px] bg-white rounded-2xl border border-gray-200 shadow-sm">
            {/* Grid Header */}
            <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-gray-100 bg-gray-50/50 sticky top-0 z-30 shadow-sm">
              <div className="p-4 border-r border-gray-100 bg-gray-50/50" />
              {weekDays.map(day => (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "p-4 text-center border-r border-gray-100 last:border-r-0",
                    isSameDay(day, new Date()) && "bg-blue-50/50"
                  )}
                >
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    isSameDay(day, new Date()) ? "text-blue-600" : "text-gray-900"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="relative grid grid-cols-[100px_repeat(7,1fr)]">
              {/* Time Labels Column */}
              <div className="flex flex-col">
                {TIME_SLOTS.map(time => (
                  <div key={time} className="h-[40px] p-4 text-right text-[10px] font-medium text-gray-400 border-r border-b border-gray-100 flex items-center justify-end">
                    {time.endsWith(':00') ? time : ''}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, dayIdx) => (
                <div 
                  key={day.toString()} 
                  className="relative border-r border-gray-100 last:border-r-0 bg-white"
                >
                  {/* Background Grid Lines */}
                  {TIME_SLOTS.map(time => (
                    <div 
                      key={`${day}-${time}-bg`} 
                      className="h-[40px] border-b border-gray-100 transition-colors hover:bg-blue-50/30 cursor-pointer"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e as any, day, time)}
                      onClick={() => setSelectingSlot({ date: day, time })}
                    />
                  ))}

                  {/* Absolute Positioned Slots */}
                  <AnimatePresence>
                    {scheduledSlots
                      .filter(s => isSameDay(s.date, day))
                      .map(slot => {
                        const course = courses.find(c => c.id === slot.courseId);
                        if (!course) return null;

                        const startHour = parseInt(slot.startTime.split(':')[0]);
                        const startMin = parseInt(slot.startTime.split(':')[1]);
                        const top = ((startHour - 8) * 80) + (startMin / 60 * 80);
                        const height = course.duration * 80;

                        const isConflicting = hasConflict(slot.date, slot.startTime, course.duration, slot.id, course.id);

                        return (
                          <motion.div
                            key={slot.id}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            draggable
                            onDragStart={(e) => handleDragStart(e as any, slot.id, 'slot')}
                            onDoubleClick={() => setEditingSlot(slot)}
                            className={cn(
                              "absolute left-1 right-1 rounded-lg p-2 text-white shadow-md z-20 group/slot overflow-hidden cursor-grab active:cursor-grabbing border",
                              isConflicting ? "border-red-500 ring-2 ring-red-500/50" : "border-white/20"
                            )}
                            style={{ 
                              top: `${top}px`, 
                              height: `${height}px`,
                              backgroundColor: course.color 
                            }}
                          >
                            <div className="text-[11px] font-bold truncate pr-4">
                              {course.name}
                              {isConflicting && <span className="ml-1 text-[10px] bg-red-500 px-1 rounded">冲突</span>}
                            </div>
                            <div className="text-[9px] opacity-90 flex flex-col gap-0.5 mt-1">
                              <div className="flex items-center gap-1">
                                <GraduationCap className="w-2.5 h-2.5" />
                                {course.grade}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {slot.startTime} - {slot.endTime} ({course.duration}h)
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveSlot(slot.id)}
                              className="absolute top-1 right-1 p-0.5 rounded-full bg-black/10 opacity-0 group-hover/slot:opacity-100 transition-opacity hover:bg-black/20"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-0 right-0 p-1 opacity-10 pointer-events-none">
                              <BookOpen className="w-12 h-12 -mr-3 -mb-3 rotate-12" />
                            </div>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conflict Error Toast */}
        <AnimatePresence>
          {conflictError && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {conflictError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single Slot Edit Dialog */}
        <Dialog open={!!editingSlot} onOpenChange={(open) => !open && setEditingSlot(null)}>
          <DialogContent className="sm:max-w-[300px]">
            <DialogHeader>
              <DialogTitle>修改单节课时间</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>开始时间</Label>
              <Select 
                value={editingSlot?.startTime} 
                onValueChange={v => editingSlot && handleUpdateSlotTime(editingSlot.id, v)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>

        {/* Course Selection Dialog */}
        <Dialog open={!!selectingSlot} onOpenChange={(open) => !open && setSelectingSlot(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>选择课程</DialogTitle>
              <DialogDescription>
                选择要安排在 {selectingSlot && format(selectingSlot.date, 'MM月dd日')} {selectingSlot?.time} 的课程
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {courses.filter(c => c.remainingSections > 0).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">没有可安排的课程</p>
                  ) : (
                    courses.filter(c => c.remainingSections > 0).map(course => (
                      <button
                        key={course.id}
                        onClick={() => handleAddCourseToSlot(course.id)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: course.color }}
                          />
                          <div>
                            <div className="font-medium text-sm">{course.name}</div>
                            <div className="text-xs text-gray-500">{course.grade} · 剩余 {course.remainingSections} 节</div>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

