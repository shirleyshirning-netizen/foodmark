interface StarRatingProps {
  rating: number
  totalRatings?: number
  size?: 'sm' | 'md'
}

export default function StarRating({ rating, totalRatings, size = 'md' }: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = i + 1 <= Math.floor(rating)
    const partial = !filled && i < rating
    return { filled, partial, index: i }
  })

  const starSize = size === 'sm' ? 'text-sm' : 'text-lg'

  return (
    <div className="flex items-center gap-1">
      <div className={`flex gap-0.5 ${starSize}`}>
        {stars.map(({ filled, partial, index }) => (
          <span key={index} className="relative inline-block leading-none">
            {filled ? (
              <span className="text-yellow-400">★</span>
            ) : partial ? (
              <span className="relative">
                <span className="text-gray-300">★</span>
                <span
                  className="absolute inset-0 overflow-hidden text-yellow-400"
                  style={{ width: `${(rating - Math.floor(rating)) * 100}%` }}
                >
                  ★
                </span>
              </span>
            ) : (
              <span className="text-gray-300">★</span>
            )}
          </span>
        ))}
      </div>
      {rating > 0 && (
        <span className={`font-bold text-gray-800 ${size === 'sm' ? 'text-sm' : 'text-base'}`}>
          {rating.toFixed(1)}
        </span>
      )}
      {totalRatings !== undefined && totalRatings > 0 && (
        <span className={`text-gray-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          ({totalRatings.toLocaleString()})
        </span>
      )}
    </div>
  )
}
