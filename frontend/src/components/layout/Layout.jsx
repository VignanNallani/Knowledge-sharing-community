import Navbar from "./Navbar";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import BookingModal from "../BookingModal";
import { useBooking } from "../../hooks/useBooking";

export default function Layout({ children, sidebarProps = {} }) {
  const booking = useBooking();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar searchValue={sidebarProps.search} onSearchChange={sidebarProps.onSearchChange} />

      <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto px-4 py-6">
        {/* Left Sidebar */}
        <aside className="col-span-3 hidden lg:block">
          <LeftSidebar 
            selectedTags={sidebarProps.selectedTags}
            onToggleTag={sidebarProps.onToggleTag}
            sortBy={sidebarProps.sortBy}
            onSortChange={sidebarProps.onSortChange}
          />
        </aside>

        {/* Main Feed */}
        <main className="col-span-12 lg:col-span-6">
          {children}
        </main>

        {/* Right Sidebar */}
        <aside className="col-span-3 hidden lg:block">
          <RightSidebar openBooking={booking.openBooking} />
        </aside>
      </div>

      {/* Global Booking Modal */}
      <BookingModal {...booking} />
    </div>
  );
}
