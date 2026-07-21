import { Pencil, Trash2, Wallet } from "lucide-react";

const CategoryCard = ({
  category,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-purple-400" />
        </div>

        <div>
          <h3 className="font-semibold text-white">
            {category.name}
          </h3>

          <p className="text-sm text-gray-400">
            {category.type === "expense" ? "مصروف" : "دخل"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(category)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-blue-500/20 transition flex items-center justify-center"
        >
          <Pencil className="w-4 h-4 text-blue-400" />
        </button>

        <button
          onClick={() => onDelete(category)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-red-500/20 transition flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
};

export default CategoryCard;