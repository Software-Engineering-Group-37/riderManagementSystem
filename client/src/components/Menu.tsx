import { useSharedValue } from './context/valueContext';

const Menu: React.FC = () => {
    const { sharedValue } = useSharedValue();
    const name = sharedValue?.name;
    console.log("Shared Value in Menu:", sharedValue, name);

    return (
        <div className="flex flex-col items-center p-4 h-screen w-full max-w-52 bg-white shadow">
            <div className="mb-6 flex flex-col items-center">
                <img src="" alt="Logo" className="w-16 h-16 mb-2" />
                <p className="text-lg font-semibold text-gray-700">Rider Management<br />System</p>
            </div>

            <MenuButton />

            <div className="mt-auto w-full flex items-center gap-4 pt-6 border-t border-gray-200">
                <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">
                    {name ? name.charAt(0).toUpperCase() : ''}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-800">{`${name}`}</p>
                    <p className="text-xs text-gray-500">Admin</p>
                </div>
            </div>
        </div>
    );

}
export default Menu;


const MenuButton: React.FC = () => {

    const button = [
        { name: "Dashboard", icon: "dashboard-icon.png", alt: "Dashboard Icon" },
        { name: "Riders", icon: "riders-icon.png", alt: "Riders Icon" },
        { name: "Shifts", icon: "shifts-icon.png", alt: "Shifts Icon" },
        { name: "History", icon: "history-icon.png", alt: "History Icon" },
        { name: "Notification", icon: "notification-icon.png", alt: "Notification Icon" }
    ]

    return (
        <div className="flex flex-col gap-2 items-start w-full">
            {button.map((item: { name: string; icon: string; alt: string }, index: number) => (
                <button key={index} className="flex items-center w-full gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
                    <img src={item.icon} alt={item.alt} className="w-4 h-4" />
                    {item.name}
                </button>
            ))}
        </div>
    );
}
