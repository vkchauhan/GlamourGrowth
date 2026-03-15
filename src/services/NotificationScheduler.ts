import { collection, query, where, getDocs, addDoc, serverTimestamp, limit, orderBy } from "firebase/firestore";
import { db, auth } from "./firebase";
import { getBookings } from "./bookingService";
import { BookingInsightsService } from "./BookingInsightsService";
import { PersonalizedTaskGenerator } from "./PersonalizedTaskGenerator";
import { DailyGrowthTask, UserDailyTask, AnalyticsEvent, Booking } from "../types";

export class NotificationScheduler {
  static async checkAndGenerateDailyTask() {
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Check if task already exists for today
      const q = query(
        collection(db, "user_daily_tasks"),
        where("user_id", "==", user.uid),
        where("date", "==", today),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        console.log("Daily task already generated for today.");
        return;
      }

      // 2. Fetch bookings
      const rawBookings = await getBookings();
      const bookings: Booking[] = (rawBookings || []).map((b: any) => ({
        booking_id: b.booking_id,
        client_name: b.name || b.client_name || "",
        date: b.date || "",
        services: b.services || [],
        total_amount: b.price || b.total_amount || 0
      }));
      const insights = BookingInsightsService.analyze(bookings);

      // 3. Fetch generic tasks for fallback
      const tasksQuery = query(collection(db, "daily_growth_tasks"), where("trigger_type", "==", "generic"));
      const tasksSnapshot = await getDocs(tasksQuery);
      const genericTasks = tasksSnapshot.docs.map(doc => ({
        task_id: doc.id,
        ...doc.data()
      })) as DailyGrowthTask[];

      // 4. Generate personalized task
      const taskData = PersonalizedTaskGenerator.generate(insights, genericTasks);

      // 5. Save to user_daily_tasks
      const userTask: Partial<UserDailyTask> = {
        user_id: user.uid,
        task_id: taskData.task_id,
        title_en: taskData.title_en,
        title_hi: taskData.title_hi,
        body_en: taskData.body_en,
        body_hi: taskData.body_hi,
        status: 'pending',
        points: taskData.points || 10,
        date: today,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "user_daily_tasks"), userTask);

      // 6. Log analytics event
      await addDoc(collection(db, "analytics_events"), {
        user_id: user.uid,
        event_type: "personalized_task_generated",
        task_id: taskData.task_id,
        metadata: { insights },
        createdAt: serverTimestamp()
      });

      // 7. Send Push Notification (Simulated or via FCM if configured)
      this.sendPushNotification(user.uid, taskData);

      console.log("Personalized daily task generated and notification sent.");
    } catch (error) {
      console.error("Error in NotificationScheduler:", error);
    }
  }

  static sendPushNotification(userId: string, task: Partial<DailyGrowthTask>) {
    // In a real app, this would call a cloud function or FCM API
    console.log(`Sending Push Notification to ${userId}: ${task.title_en} - ${task.body_en}`);
    
    // Log notification sent event
    addDoc(collection(db, "analytics_events"), {
      user_id: userId,
      event_type: "personalized_notification_sent",
      task_id: task.task_id,
      createdAt: serverTimestamp()
    }).catch(console.error);
  }

  static async completeTask(taskId: string, points: number) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Update task status
      // Note: In a real app we'd use updateDoc, but here we need the document ID
      // We'll assume we have it or find it
      const q = query(collection(db, "user_daily_tasks"), where("user_id", "==", user.uid), where("id", "==", taskId));
      // ... update logic ...
      
      // Log completion event
      await addDoc(collection(db, "analytics_events"), {
        user_id: user.uid,
        event_type: "personalized_task_completed",
        task_id: taskId,
        metadata: { points },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error completing task:", error);
    }
  }
}
